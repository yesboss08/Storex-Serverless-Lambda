import { AllPlansInfo } from "../utils/Constant/StoragePlans.js";
import crypto from "crypto";
import express from "express";
import {
     handleActiveSubscription,
     handleCancelSubscription,
     handleChargedSubscription,
     handleCreateSubscription,
     handleInvoicePaid,
     handlePendingSubscription,
} from "../utils/razorpayWebhook.js";
import CheeckAuth from "../middlewares/newAuth.js";
import Razorpay from "razorpay";
import {
     validateWebhookSignature,
     validatePaymentVerification,
} from "razorpay/dist/utils/razorpay-utils.js";
import userModels from "../Models/userModel.js";
import SubscriptionModel from "../Models/Subscription.js";
import {
     isAllowedTOBuy,
     ValidPayment,
} from "../utils/permission/RazorpaySubscription.js";
import { clouddebugger } from "googleapis/build/src/apis/clouddebugger/index.js";
import { Config } from "../utils/Config/Config.js";

const router = express.Router();

//TODO:MOVE TO ENV
var Api_Secreate = Config.Razorpay_Api_Secreate;
var Api_KEY_ID = Config.Razorpay_Api_KEY_ID;

//razorpay instace
const razorpayInstace = new Razorpay({
     key_id: Api_KEY_ID,
     key_secret: Api_Secreate,
});

//handle the webhook actions
router.post("/santa08webhook", async (req, res, next) => {
     const secreate = "sanat08";
     const event = req.body?.event;
     const payload = req.body.payload.subscription?.entity;

     const rezScerate = req.headers["x-razorpay-signature"];
     const isValid = validateWebhookSignature(req.rawBody, rezScerate, secreate);
     if (!isValid) return res.status(401).json({ err: "unauthenticated" });
     //collect user plan
     const userPlan = AllPlansInfo.find(
          (plans) => plans.plan_id == payload?.plan_id
     );
     if (!userPlan.plan_id)
          return res.status(404).json({ msg: "plan does not exist" });

     if (event == "subscription.activated") {
          const updated = await handleActiveSubscription({ payload, userPlan });
          if (updated.msg) return res.status(200).json(updated);
          return res.status(404).json(updated);
     }
     if (event == "subscription.charged") {
          const updated = await handleChargedSubscription({ payload, userPlan });
          if (updated?.msg) return res.status(200).json(updated);
          return res.status(404).json(updated);
     }
     if (event == "subscription.cancelled") {
          const updated = await handleCancelSubscription({ payload, userPlan });
          if (updated.msg) return res.status(200).json(updated);
          return res.status(404).json(updated);
     }

     if (event == "subscription.holted" || event == "subscription.pending") {
          const updated = await handlePendingSubscription({ payload });
          if (updated.msg) return res.status(200).json(updated);
          return res.status(404).json(updated);
     }
     if (event == "invoice.paid") {
          const invoicePayload = req.body.payload.invoice?.entity;
          console.log("invoice.paid fired");
          const updated = await handleInvoicePaid({ payload: invoicePayload });
          if (updated.msg) return res.status(200).json(updated);
          return res.status(404).json(updated);
     }

     return res.status(200).json({ msg: "got" });
});

//sending the razorpayInstace. plans
router.get("/plans", async (req, res) => {
     const { sid } = req.signedCookies;
     if(!sid) return res.status(200).json(AllPlansInfo)
console.log({sid})
     const { uid } = JSON.parse(Buffer.from(sid, "base64url").toString("utf-8"));
     const userSubscriptionData = await SubscriptionModel.findOne({ userId: uid });
     if(!userSubscriptionData?._id) return res.status(200).json(AllPlansInfo)
     const UsersPlan = AllPlansInfo.map((plan) => {
          return plan.plan_id == userSubscriptionData?.planId
               ? { ...plan, userPerchased: true }
               : plan;
     });
     if (userSubscriptionData?.status == "active") res.status(200).json(UsersPlan);
});

//create the subscription and send the url
router.post("/createSub/:plan_id", CheeckAuth, async (req, res, next) => {
     const { plan_id } = req.params;
     //TODO: add currentPlan_id in redis inside session
     const { userId, email } = req.userData;
     const planDetails = AllPlansInfo.find((plan) => plan.plan_id == plan_id);
     if (!planDetails?.plan_id)
          return res.status(404).json({ err: "invalid plan" });
     const currentUserSubData = await SubscriptionModel.findOne({
          userId,
          isActive: true,
     }).lean();
     const currentPlan = AllPlansInfo.find(
          (plan) => plan.plan_id == currentUserSubData?.planId
     );
     //cheeck the permission
     const isAllowed = isAllowedTOBuy({
          currentPlan: currentPlan?.name || "freeTier",
          currentSubStatus: currentUserSubData?._id ? true : false,
          PlanTOBuy: planDetails?.name,
     });
     if (!isAllowed.stas) return res.status(404).json({ err: isAllowed?.msg });
     try {
          const subData = await razorpayInstace.subscriptions.create({
               plan_id,
               total_count: 12,
               customer_notify: false,
               quantity: 1,
               notes: { userId, email, planName: planDetails?.name },
          });
          if (subData?.status !== "created") next(error);
          res.status(201).json(subData);
     } catch (error) {
          console.log("error while creating subscription", error);
          next(error);
     }
});

//cancel the subscription
router.post("/cancelSub/:subId", CheeckAuth, async (req, res, next) => {
     const { userData } = req;
     const { subId } = req.params;
     try {
          const subData = await SubscriptionModel.findOne({
               sub_id: subId,
               userId: userData?.userId,
          });
          if (subData?.status != "active")
               return res.status(401).json({ err: "unauthenticated" });
          const data = await razorpayInstace.subscriptions.cancel(subId, {
               cancel_at_cycle_end: true,
          });
          console.log(data);
          res.status(200).json({ msg: "sub cancelled" });
     } catch (error) {
          console.log("error while cancelling the subscription", error);
     }
});

//create the subscription document from
router.post("/verifySubscriptioPayment", CheeckAuth, async (req, res, next) => {
     const { userData } = req;
     const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } =
          req.body;
     const isValid = validatePaymentVerification(
          {
               payment_id: razorpay_payment_id,
               subscription_id: razorpay_subscription_id,
          },
          razorpay_signature,
          Api_Secreate
     );
     if (!isValid) return next(new Error("faild verification"));
     try {
          const SubscriptionData = await razorpayInstace.subscriptions.fetch(
               razorpay_subscription_id
          );
          const userPlan = AllPlansInfo.find(
               (plan) => plan.plan_id == SubscriptionData?.plan_id
          );
          const PaymnetDetails =
               await razorpayInstace.payments.fetch(razorpay_payment_id);
          const isValidPayment = ValidPayment({ PaymnetDetails, userPlan });
          if (SubscriptionData?.notes?.userId !== userData?.userId || !isValidPayment)
               return next(new Error("invalid"));
          const data = await handleCreateSubscription({
               payload: SubscriptionData,
               userPlan,
          });
          if (data.msg) return res.status(201).json({ msg: data.msg });
          return res.status(404).json({ err: data?.err || "error" });
     } catch (error) {
          console.log("error while fetch subscription", error);
          return res.status(404).json({ err: "error while fetch subscription" });
     }
});

//get all invoices data of the subscription

export default router;
