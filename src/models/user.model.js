import mongoose, {Schema} from "mongoose"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema = new Schema(
   {
      username: {
         type: String,
         required: true,
         unique: true,
         trim: true,
         index: true
      },
      email: {
         type: String,
         required: true,
         unique: true,
         lowercase: true,
         trim: true,
      },
      avatar: {
         type: String, // cloudinary url
         default: "" // Default avatar URL or empty
       },
      password: {
         type: String,
         required: [true, 'password is required'],
      },
      refreshToken: {
         type: String
      }
   },
   {
      timestamps: true
   }
)

userSchema.pre("save", async function (next) {
   if(!this.isModified("password")) return next();

   this.password = await bcrypt.hash(this.password, 5)
   next()
}) // encrypts the password before saving it into backend

userSchema.methods.isPasswordCorrect = async function (password){
   return await bcrypt.compare(password, this.password)
} // just a function to check whether password is correct or not
  // kind of a middleware
  // returns boolean value

userSchema.methods.generateAccessToken = function (){
   jwt.sign(
      {
         _id: this._id,
         email: this.email,
         username: this.username
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
         expiresIn: ACCESS_TOKEN_EXPIRY
      }
)
} // function for generation of access token

userSchema.methods.generateRefreshToken = function (){
   jwt.sign(
      {
         _id: this._id,
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
         expiresIn: REFRESH_TOKEN_EXPIRY
      }
)
} // this func creates refresh token



export const User = mongoose.model("User", userSchema)