import redisClient from "../DB/redisDB.js";

const CheeckAuth = async (req, res, next) => {
    const { sid } = req?.signedCookies;
    if (!sid) return res.status(409).json({ err: "session expired" });

    try {
        const { sesID, uid } = JSON.parse(
            Buffer.from(sid, "base64url").toString("utf-8")
        );
        const sessionData = await redisClient.json.get(`session:${uid}:${sesID}`);
        if (!sessionData?.id)
            return res.status(409).json({ err: "session expired" });
        if (!sessionData?.userId)
            return res.status(409).json({ err: "user dont exist" });
        req.userData = sessionData;
        next();
    } catch (error) {
        console.log("error while cheecking the auth", error);
        next(new Error());
    }
};

export default CheeckAuth;

