import userModels from "../Models/userModel.js";
import SubscriptionModel from "../Models/Subscription.js";
import { AllPlansInfo } from "./Constant/StoragePlans.js";
import redisClient from "../DB/redisDB.js";

//handle create subscription
export const handleCreateSubscription = async ({ payload, userPlan }) => {
  const { current_start, current_end, plan_id, id } = payload;
  const { userId } = payload?.notes;
  const { name, Plan_maxStorageInBytes, period } = userPlan;
  const starts_at = current_start || Math.floor(Date.now() / 1000);
  const ends_at =
    period == "yearly"
      ? starts_at + 3600 * 24 * 365
      : starts_at + 3600 * 24 * 30;
  try {
    const userData = await userModels.findById(userId);
    userData.maxStorageInBytes = Plan_maxStorageInBytes || 536870912;
    if (!userData?._id) return { err: "error while getting userData" };
    if (userData?.purchasedPlan?.purchasedPlanId) {
      const existingSubcription = await CheckSubScriptionIsExist({
        subDocId: userData?.purchasedPlan?.purchasedPlanId,
        subID: id,
        ends_at,
        userId,
      });
      if (
        existingSubcription?.ends_at == current_end &&
        existingSubcription?.isActive
      )
        return { msg: "already created" };
      if (existingSubcription?.planId == plan_id)
        return { err: "already subscription existed" };
    }
    const userSubscription = await SubscriptionModel.create({
      planId: plan_id,
      sub_id: id,
      planName: name,
      starts_at,
      ends_at,
      expired_at: new Date(ends_at * 1000 + 3600 * 1000),
      maxStorageLimit: Plan_maxStorageInBytes,
      isActive: true,
      userId,
    });
    //update the user doc
    userData.purchasedPlan = {
      purchasedPlanId: userSubscription?._id,
      PlanStatus: "active",
    };
    await userData.save();
    if (userSubscription?._id) return { msg: "updated" };
  } catch (error) {
    console.log("error handleActiveSubscription", error);
    return { err: "error while updating" };
  }
};

//activated subscription
export const handleActiveSubscription = async ({ payload, userPlan }) => {
  const { current_start, current_end, plan_id, id } = payload;
  const { userId } = payload?.notes;
  const { name, Plan_maxStorageInBytes } = userPlan;
  try {
    const userData = await userModels.findById(userId);
    userData.maxStorageInBytes = Plan_maxStorageInBytes || 536870912;
    if (!userData?._id) return { err: "error while getting userData" };
    if (userData?.purchasedPlan?.purchasedPlanId) {
      const existingSubcription = await CheckSubScriptionIsExist({
        userId,
        subID: id,
        ends_at: current_end,
      });
      if (existingSubcription.sub_id == id && existingSubcription?.isActive) {
        await existingSubcription.updateOne({
          $set: {
            starts_at: current_start,
            ends_at: current_end,
            expired_at: new Date(current_end * 1000 + 3600 * 1000),
          },
        });
        return { msg: "already created" };
      }
      if (existingSubcription?.planId == plan_id)
        return { err: "already subscription existed" };
    }
    const userSubscription = await SubscriptionModel.create({
      planId: plan_id,
      sub_id: id,
      planName: name,
      starts_at: current_start,
      ends_at: current_end,
      expired_at: new Date(current_end * 1000),
      maxStorageLimit: Plan_maxStorageInBytes,
      isActive: true,
      userId,
    });
    //update the user doc
    userData.purchasedPlan = {
      purchasedPlanId: userSubscription?._id,
      PlanStatus: "active",
    };
    await userData.save();
    if (userSubscription?._id) return { msg: "updated" };
  } catch (error) {
    console.log("error handleActiveSubscription", error);
    return { err: "error while updating" };
  }
};

//charged subscription
export const handleChargedSubscription = async ({ payload, userPlan }) => {
  const { current_start, current_end, plan_id, id } = payload;
  const { userId } = payload?.notes;
  const { name, Plan_maxStorageInBytes } = userPlan;
  const previousSubScription = await SubscriptionModel.findOne({
    userId,
    sub_id: id,
  });
  if (current_end == previousSubScription?.ends_at)
    return { msg: "already updated" };
  try {
    const userData = await userModels.findById(userId);
    if (!userData?._id) return { err: "error while getting userData" };
    //if previous subscription is not deleted
    if (previousSubScription?._id) {
      await previousSubScription.updateOne({
        $set: {
          isActive: true,
          starts_at: current_start,
          ends_at: current_end,
          expired_at: new Date(current_end * 1000 + 1000 * 3600 * 96),
        },
      });
    } else {
      //create a new one and update in the userDb data
      const userSubscription = await SubscriptionModel.create({
        planId: plan_id,
        sub_id: id,
        planName: name,
        starts_at: current_start,
        ends_at: current_end,
        expired_at: new Date(current_end * 1000),
        maxStorageLimit: Plan_maxStorageInBytes,
        isActive: true,
        userId,
      });
      userData.purchasedPlan = {
        purchasedPlanId: userSubscription._id,
        PlanStatus: "active",
      };
      await userData.save();
    }
    if (userSubscription?._id) return { msg: "updated" };
  } catch (error) {
    console.log("error handleActiveSubscription", error);
    return { err: "error while updating" };
  }
};

//cancel the subscritption
export const handleCancelSubscription = async ({ payload }) => {
  const { userId } = payload?.notes;
  const { current_end, id } = payload;
  try {
    const userData = await userModels.findById(userId);
    if (id != userData?.purchasedPlan?.purchasedPlanId)
      return { err: "error while updating" };
    await userData.updateOne({
      $set: {
        "purchasedPlan.PlanStatus": "cancelled",
        maxStorageInBytes: 536870912,
      },
    });
    const subData = await SubscriptionModel.findById(
      userData?.purchasedPlan?.purchasedPlanId
    );
    subData.expired_at = new Date(Date.now() + 1000 * 3600 * 24 * 3);
    subData.status = "cancel";
    await subData.save();
    //TODO:email-Send a cancel mail
    return { msg: "updated" };
  } catch (error) {
    console.log("error handleActiveSubscription", error);
    return { err: "error while updating" };
  }
};

export const handlePendingSubscription = async ({ payload }) => {
  const { userId } = payload?.notes;
  try {
    const userData = await userModels.findByIdAndUpdate(userId, {
      $set: { maxStorageInBytes: 536870912, purchasedPlan: null },
    });
    if (userData?._id) return { err: "error while getting userData" };
    await SubscriptionModel.updateOne(
      { _id: userData?.purchasedPlan },
      { $set: { isActive: false } }
    );
    return { msg: "updated" };
  } catch (error) {
    console.log("error handleActiveSubscription", error);
    return { err: "error while updating" };
  }
};

export const handleInvoicePaid = async ({ payload }) => {
  console.log(payload);
  return { msg: "updated" };
};

export const CheckSubScriptionIsExist = async ({ subID, userId }) => {
  try {
    const existingSubScription = await SubscriptionModel.findOne({
      sub_id: subID,
      userId,
    });
    console.log(existingSubScription);
    if (existingSubScription?._id) return existingSubScription;
    return null;
  } catch (error) {
    console.log("error while find the subscription", error);
    return null;
  }
};

// {mount =
// 19900
// amount_due =
// 0
// amount_paid =
// 19900
// billing_end =
// null
// billing_start =
// null
// cancelled_at =
// null
// comment =
// null
// created_at =
// 1762672472
// currency =
// 'INR'
// currency_symbol =
// '₹'
// customer_details =
// {id: null, name: null, email: 'rathsanantakumar@gmail.com', contact: '+918328903372', gstin: null, …}
// customer_id =
// null
// date =
// 1762672472
// description =
// null
// email_status =
// null
// entity =
// 'invoice'
// expire_by =
// null
// expired_at =
// null
// first_payment_min_amount =
// null
// id =
// 'inv_RdYUZy3TU0J51m'
// idempotency_key =
// null
// invoice_number =
// null
// issued_at =
// 1762672472
// notes =
// (0) []
// order_id =
// 'order_RdYUa7DM4ocZQk'
// paid_at =
// 1762672486
// partial_payment =
// false
// payment_id =
// 'pay_RdYUig66uPM92Y'
// receipt =
// null
// ref_num =
// null
// reminder_status =
// null
// short_url =
// 'https://rzp.io/rzp/IJqsySQ'
// sms_status =
// null
// status =
// 'paid'
// subscription_id =
// 'sub_RdYUZTL8IK1i1R'
// subscription_status =
// null
// supply_state_code =
// null
// tax_amount =
// 0
// taxable_amount =
// 19900
// terms =
// null
// type =
// 'invoice'
// user_id =
// null
// view_less =
// true}
