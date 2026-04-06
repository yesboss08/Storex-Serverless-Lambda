import mongoose,{model, Schema, Types} from "mongoose";
import { required } from "zod/v4-mini";

const TokensSchema = new Schema({
  accessToken:{ type: String, required: true },
  refreshToken:{ type: String, required: true },
  expiryDate:{ type: Number, required: true }, 
},{_id:false})

const PlanDetails = new Schema({
  purchasedPlanId:{type:Types.ObjectId , default:null, ref:'subscription'},
  PlanStatus:{type:String , enum:["active", "cancelled"], required:true}
},{_id:false})

const userSchema = new Schema({
    name: {
        type: String,
        minLength: 4,
        required: [true, 'name is required'],
      },
      password: {
        type: String,
        minLength: 5,
       default:null
      },
      email: {
     type:String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Please enter a valid email address']
      },
      rootDirID: {
        type: Schema.Types.ObjectId,ref:"directoryDB"
      },
avatar:{
type:String, default:null
},
GoogleSubID:{
  type:String , default:null
}
,
Tokens:{
type:TokensSchema, default:null
},
maxStorageInBytes:{
type:Number , default:536870912
},
      emailVarified:{
        type:Boolean , default:false
      },
      role:{
        type:String , enum:["admin", "user", "manager", "owner"], default:"user"
      },
      isDeleted:{
        type:Boolean , default:false
      },
      purchasedPlan:{
        type:PlanDetails , default:null
      }
},{timestamps:true})

const userModels =  model('userDB',userSchema,'userDB')

export default userModels

