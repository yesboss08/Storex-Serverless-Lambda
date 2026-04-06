import  {Schema,model} from "mongoose";
import mongoose from "mongoose";

const SubscritptionSchema = new mongoose.Schema({
   userId :{type:Schema.Types.ObjectId, required: true },
 planName: { type: String, required: true },
 planId: { type: String, required: true },
  sub_id:{type: String, required: true},
  status:{type:String , default:"active" , enum:["active","pending","cancel"]},
  starts_at: { type: Number, required: true, default: () => Math.floor(Date.now() / 1000) },
  maxStorageLimit:{ type: Number, required: true },
  ends_at: { type: Number, required: true } ,
  expired_at:{type:Date,required:true},
  isActive:{type:Boolean, default:false}
})

SubscritptionSchema.index({expired_at:1}, {expireAfterSeconds: 0 })

const SubscriptionModel =  mongoose.model('subscription', SubscritptionSchema)

export default SubscriptionModel 