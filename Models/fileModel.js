import mongoose, { Schema, model } from "mongoose";

const fileSchema = new Schema(
  {
    name: {
      type: String,
      minLength: [2, "Lenght atlest more than 1"],
      required: [true, "name must be reqiured"],
    },
    extension: {
      type: String,
      required: [true, "extension is missing"],
    },
    userId:{
      type:mongoose.Schema.ObjectId , ref:"userDB" , required:true
    }
    ,
    parent: {
      type: Schema.Types.ObjectId,
      required: [true, "parent of the file is missing"],
      ref: "directoryDB",
    },
    size: {
      type: String,
      required: [true, "size of the file is missing"],
      ref: "directoryDB",
    },
    path: {
      type: [Schema.Types.ObjectId],
      default: [],
    },
    isPaid:{type:Boolean , default:false}
    ,
      isUploading:{type:Boolean , default:true},
      general_access_type: {
      type:String, enum:["private", "public"], default:"private"
   }
    
  },
  { timestamps: true }
);

const fileModel = model("fileDB", fileSchema, "fileDB");

export default fileModel;
