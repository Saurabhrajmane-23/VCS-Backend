import { promises as fs } from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { ApiError } from "../utils/ApiError.js";

const execAsync = promisify(exec);

class GitService {
  constructor() {
    this.reposBasePath = path.join(process.cwd(), "repositories");
  }

  async initializeRepository(repoName, ownerId) {
    try {
      // Create repository directory
      const repoPath = path.join(this.reposBasePath, ownerId, repoName);
      await fs.mkdir(repoPath, { recursive: true });

      // Initialize git repository
      await execAsync("git init", { cwd: repoPath });

      // Create initial commit
      await execAsync('git commit --allow-empty -m "Initial commit"', {
        cwd: repoPath,
      });

      return repoPath;
    } catch (error) {
      throw new ApiError(500, "Failed to initialize repository", [
        error.message,
      ]);
    }
  }

  async cloneRepository(repoPath, targetPath) {
    try {
      await execAsync(`git clone ${repoPath} ${targetPath}`);
      return true;
    } catch (error) {
      throw new ApiError(500, "Failed to clone repository", [error.message]);
    }
  }

  async pushChanges(repoPath, branch = "main") {
    try {
      await execAsync("git add .", { cwd: repoPath });
      await execAsync('git commit -m "Update"', { cwd: repoPath });
      await execAsync(`git push origin ${branch}`, { cwd: repoPath });
      return true;
    } catch (error) {
      throw new ApiError(500, "Failed to push changes", [error.message]);
    }
  }

  async pullChanges(repoPath, branch = "main") {
    try {
      await execAsync(`git pull origin ${branch}`, { cwd: repoPath });
      return true;
    } catch (error) {
      throw new ApiError(500, "Failed to pull changes", [error.message]);
    }
  }

  async createBranch(repoPath, branchName) {
    try {
      await execAsync(`git checkout -b ${branchName}`, { cwd: repoPath });
      return true;
    } catch (error) {
      throw new ApiError(500, "Failed to create branch", [error.message]);
    }
  }

  async getRepositoryInfo(repoPath) {
    try {
      const [status, branches, remotes] = await Promise.all([
        execAsync("git status --porcelain", { cwd: repoPath }),
        execAsync("git branch -a", { cwd: repoPath }),
        execAsync("git remote -v", { cwd: repoPath }),
      ]);

      return {
        status: status.stdout,
        branches: branches.stdout,
        remotes: remotes.stdout,
      };
    } catch (error) {
      throw new ApiError(500, "Failed to get repository info", [error.message]);
    }
  }
}

export const gitService = new GitService();
