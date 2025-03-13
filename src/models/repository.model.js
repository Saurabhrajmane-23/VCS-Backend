import mongoose, {Schema} from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"

const repoSchema = new Schema(
   {
      name: {
         type: String,
         required: true,
         unique: true,
         trim: true,
         index: true
      },
      description: {
         type: String,
      },
      isPublic: {
         type: Boolean,
         default: true
      },
      collabarators: [{
         type: Schema.Types.ObjectId,
         ref: "User"
      }],
      owner: {
         type: Schema.Types.ObjectId,
         ref: "User"
      },
      defaultBranch: {
         type: String,
         default: "main"
       },
       size: {
         type: Number,
         default: 0
       },
       // You could track the number of commits, branches, etc.
       stats: {
         commits: {
           type: Number,
           default: 0
         },
         branches: {
           type: Number,
           default: 0
         }
       }
   },
   {
      timestamps: true
   }
)

repoSchema.plugin(mongooseAggregatePaginate)

export const Repo = mongoose.model("Repo", repoSchema)