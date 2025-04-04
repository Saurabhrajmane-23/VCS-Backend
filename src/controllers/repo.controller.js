import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Repository } from "../models/repository.model.js";

const createRepository = asyncHandler(async(req, res) => {

   // step 1 : get user details from frontend
   const {name, description, isPublic} = req.body;
   console.log(req.body);
   

   // step 2 : validate input
   if(!name){
      throw new ApiError(400, "Name is required");
   }  

   // step 3 : check if repository already exists
   const existingRepo = await Repository.findOne({name});
   
   if (existingRepo) {
      return res
        .status(201)
        .json(new ApiResponse(200, existingRepo, "Repository already exists"));
    }

   // step 4 : create repository
   const repository = await Repository.create({
      name,
      description,
      isPublic,
      owner: req.user._id,
   });

   // step 5 : check if repository is created successfully or not
   const createdRepo = await Repository.findById(repository._id).select("-owner");

   if(!createdRepo){
      throw new ApiError(500, "Failed to create repository");
   }

   // step 6 : return success response
   return res
    .status(201)
    .json(new ApiResponse(200, createdRepo, "Repository created successfully"));
   

})

export {createRepository};





