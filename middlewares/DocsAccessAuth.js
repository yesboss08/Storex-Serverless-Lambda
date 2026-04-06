import fileModel from "../Models/fileModel.js";
import directoryModel from "../Models/directoryModel.js";

export const CheeckDirAuth = async (req, res, next, id) => {
    const userData = req.userData;
    const dirData = await directoryModel.findOne({ _id: id }).lean();
    const isOwner = dirData.userId == userData._id ? true : false;
    if (!isOwner)
        return res.status(401).json({ error: "you are not allowed to cerate " });
};

export const CheeckFileAuth = async (req, res, next) => { };
