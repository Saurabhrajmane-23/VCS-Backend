import { Server } from "ssh2";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { User } from "../models/user.model.js";
import { Repo } from "../models/repository.model.js";

const execAsync = promisify(exec);

// Directory to store repositories
const REPO_DIR = path.join(process.cwd(), "repositories");

// Ensure repositories directory exists
if (!fs.existsSync(REPO_DIR)) {
  fs.mkdirSync(REPO_DIR, { recursive: true });
}

/**
 * Initialize a Git SSH server to handle Git operations
 * @param {number} port - Port to run the SSH server on
 */
export const startGitServer = (port = 2222) => {
  // Load SSH keys (for testing, these should be securely managed in production)
  const hostKeys = [
    fs.readFileSync(path.join(process.cwd(), "ssh", "host.key")),
  ];

  // Create SSH server
  const server = new Server(
    {
      hostKeys,
      debug: process.env.NODE_ENV === "development" ? console.log : undefined,
    },
    (client) => {
      console.log("Client connected!");

      // Handle client authentication
      client.on("authentication", async (ctx) => {
        // In production, you would use proper authentication methods
        // For simplicity, we're using password authentication here
        if (ctx.method === "password") {
          try {
            // Authenticate user with DB
            const user = await User.findOne({
              $or: [{ username: ctx.username }, { email: ctx.username }],
            });

            if (user && (await user.isPasswordCorrect(ctx.password))) {
              console.log(`User ${ctx.username} authenticated`);
              // Attach user to client for later use
              client.user = user;
              ctx.accept();
              return;
            }
          } catch (error) {
            console.error("Authentication error:", error);
          }
        }
        ctx.reject();
      });

      // Handle client commands (git-upload-pack, git-receive-pack)
      client.on("session", (accept, reject) => {
        const session = accept();

        session.on("exec", async (accept, reject, info) => {
          const command = info.command;
          console.log(`Command: ${command}`);

          // Parse Git commands
          const match = command.match(
            /^(git-upload-pack|git-receive-pack) '(.*)'$/
          );
          if (!match) {
            console.error("Invalid Git command");
            return reject();
          }

          const [, gitCommand, repoPath] = match;
          const repoName = repoPath.replace(/^\/|\/$/g, "");

          try {
            // Find repository in database
            const repository = await Repo.findOne({ name: repoName });

            if (!repository) {
              console.error(`Repository not found: ${repoName}`);
              return reject();
            }

            // Check permissions
            const userId = client.user._id.toString();
            const isOwner = repository.owner.toString() === userId;
            const isCollaborator = repository.collabarators.some(
              (id) => id.toString() === userId
            );

            if (!repository.isPublic && !isOwner && !isCollaborator) {
              console.error(
                `Permission denied for user ${client.user.username} on repo ${repoName}`
              );
              return reject();
            }

            // For receive-pack (push), only owner and collaborators can push
            if (
              gitCommand === "git-receive-pack" &&
              !isOwner &&
              !isCollaborator
            ) {
              console.error(
                `Push permission denied for user ${client.user.username} on repo ${repoName}`
              );
              return reject();
            }

            const stream = accept();
            const repoFullPath = path.join(
              REPO_DIR,
              repository.owner.toString(),
              repoName
            );

            // Execute Git command
            const git = exec(
              `${gitCommand} '${repoFullPath}'`,
              { env: { ...process.env, GIT_HTTP_EXPORT_ALL: "1" } },
              (err, stdout, stderr) => {
                if (err) {
                  console.error(`Git command error: ${err.message}`);
                }
              }
            );

            // Pipe data between client and Git process
            stream.pipe(git.stdin);
            git.stdout.pipe(stream);
            git.stderr.pipe(stream.stderr);

            // Update repository stats on command completion
            git.on("exit", async (code) => {
              if (code === 0 && gitCommand === "git-receive-pack") {
                try {
                  // Update repository stats
                  const { stdout } = await execAsync(
                    "git rev-list --count HEAD",
                    { cwd: repoFullPath }
                  );
                  const commitCount = parseInt(stdout.trim(), 10);

                  const { stdout: branchOutput } = await execAsync(
                    "git branch | wc -l",
                    { cwd: repoFullPath }
                  );
                  const branchCount = parseInt(branchOutput.trim(), 10);

                  const { stdout: contributorsOutput } = await execAsync(
                    "git log --format='%ae' | sort -u | wc -l",
                    { cwd: repoFullPath }
                  );
                  const contributorsCount = parseInt(
                    contributorsOutput.trim(),
                    10
                  );

                  // Get last commit information
                  const { stdout: lastCommitOutput } = await execAsync(
                    'git log -1 --pretty=format:"%H|%s|%an|%ae|%ct"',
                    { cwd: repoFullPath }
                  );

                  if (lastCommitOutput) {
                    const [hash, message, authorName, authorEmail, timestamp] =
                      lastCommitOutput.split("|");

                    await Repo.findByIdAndUpdate(repository._id, {
                      stats: {
                        commits: commitCount,
                        branches: branchCount,
                        contributors: contributorsCount,
                      },
                      lastCommit: {
                        hash,
                        message,
                        author: {
                          name: authorName,
                          email: authorEmail,
                        },
                        timestamp: new Date(parseInt(timestamp, 10) * 1000),
                      },
                    });
                  }
                } catch (error) {
                  console.error("Error updating repository stats:", error);
                }
              }
            });
          } catch (error) {
            console.error("Error in Git command handling:", error);
            reject();
          }
        });
      });

      client.on("end", () => {
        console.log("Client disconnected");
      });
    }
  ).listen(port, "0.0.0.0", function () {
    console.log(`Git SSH server listening on port ${port}`);
  });

  return server;
};
