const PixelSetting = require("../models/PixelSetting");
const crypto = require("crypto");
const axios = require("axios");

// 🛠️ Helper Function: Hash user data (Required by FB & TikTok)
const hashData = (data) => {
    if (!data) return undefined;
    return crypto.createHash("sha256").update(data.trim().toLowerCase()).digest("hex");
};

exports.handleServerEvent = async (req, res) => {
    // 🚀 ১. ফ্রন্টএন্ডকে সাথে সাথে Success রেসপন্স দিয়ে দিবো, যাতে ইউজারকে অপেক্ষা করতে না হয়।
    // CAPI এর কাজ ব্যাকগ্রাউন্ডে (Asynchronously) চলতে থাকবে।
    res.status(200).json({ success: true, message: "Event received by server" });

    try {
        const { eventName, eventId, eventSourceUrl, payload, userContext } = req.body;
        
        // ২. ইউজারের IP এবং User-Agent বের করা (CAPI-এর জন্য খুব গুরুত্বপূর্ণ)
        const clientIpAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const clientUserAgent = req.headers['user-agent'];

        // ৩. ডাটাবেস থেকে শুধু Active পিক্সেলগুলো আনা
        const activePixels = await PixelSetting.find({ isActive: true });

        // ==========================================
        // 🟦 FACEBOOK CONVERSIONS API (CAPI)
        // ==========================================
        const fbPixel = activePixels.find(p => p.provider === 'facebook' && p.accessToken);
        if (fbPixel) {
            const fbPayload = {
                data: [
                    {
                        event_name: eventName,
                        event_time: Math.floor(Date.now() / 1000), // Current time in Unix timestamp
                        action_source: "website",
                        event_id: eventId, // 🔥 Deduplication Key
                        event_source_url: eventSourceUrl,
                        user_data: {
                            client_ip_address: clientIpAddress,
                            client_user_agent: clientUserAgent,
                            em: hashData(userContext?.email),
                            ph: hashData(userContext?.phone),
                            fn: hashData(userContext?.firstName),
                            ln: hashData(userContext?.lastName),
                        },
                        custom_data: {
                            currency: payload?.currency || "BDT",
                            value: payload?.value || 0,
                            content_ids: payload?.content_ids,
                            content_name: payload?.content_name,
                            content_type: payload?.content_type || "product"
                        }
                    }
                ]
            };

            // Test Event Code (যদি অ্যাডমিন প্যানেলে দেওয়া থাকে)
            if (fbPixel.testEventCode) {
                fbPayload.test_event_code = fbPixel.testEventCode;
            }

            // FB Graph API তে সেন্ড করা
            axios.post(
                `https://graph.facebook.com/v19.0/${fbPixel.pixelId}/events?access_token=${fbPixel.accessToken}`, 
                fbPayload
            ).catch(err => console.error("FB CAPI Error:", err.response?.data || err.message));
        }


        // ==========================================
        // ⬛ TIKTOK EVENTS API (Server-Side)
        // ==========================================
        const tiktokPixel = activePixels.find(p => p.provider === 'tiktok' && p.accessToken);
        if (tiktokPixel) {
            const tiktokPayload = {
                pixel_code: tiktokPixel.pixelId,
                event: eventName,
                event_id: eventId, // 🔥 Deduplication Key
                timestamp: new Date().toISOString(),
                context: {
                    page: { url: eventSourceUrl },
                    user: {
                        phone_number: hashData(userContext?.phone),
                        email: hashData(userContext?.email)
                    },
                    user_agent: clientUserAgent,
                    ip: clientIpAddress
                },
                properties: {
                    contents: payload?.content_ids?.map(id => ({
                        content_id: id,
                        content_type: payload?.content_type || "product",
                        content_name: payload?.content_name
                    })),
                    value: payload?.value || 0,
                    currency: payload?.currency || "BDT"
                }
            };

            // TikTok API তে সেন্ড করা
            axios.post(
                `https://business-api.tiktok.com/open_api/v1.3/pixel/track/`,
                tiktokPayload,
                { headers: { "Access-Token": tiktokPixel.accessToken } }
            ).catch(err => console.error("TikTok API Error:", err.response?.data || err.message));
        }

        // ==========================================
        // 🟧 GOOGLE ANALYTICS 4 (Measurement Protocol)
        // ==========================================
        const ga4Pixel = activePixels.find(p => p.provider === 'ga4' && p.accessToken);
        if (ga4Pixel) {
            // Mapping Standard Events to GA4 Events
            const ga4EventMap = {
                ViewContent: "view_item",
                AddToCart: "add_to_cart",
                InitiateCheckout: "begin_checkout",
                Purchase: "purchase",
                PageView: "page_view"
            };

            const ga4Name = ga4EventMap[eventName];
            
            if (ga4Name) {
                const ga4Payload = {
                    client_id: eventId, // Using eventId as a unique session/client identifier for S2S
                    events: [
                        {
                            name: ga4Name,
                            params: {
                                currency: payload?.currency || "BDT",
                                value: payload?.value || 0,
                                items: payload?.content_ids?.map(id => ({ item_id: id, item_name: payload?.content_name })),
                                transaction_id: payload?.order_id
                            }
                        }
                    ]
                };

                axios.post(
                    `https://www.google-analytics.com/mp/collect?measurement_id=${ga4Pixel.pixelId}&api_secret=${ga4Pixel.accessToken}`,
                    ga4Payload
                ).catch(err => console.error("GA4 MP Error:", err.response?.data || err.message));
            }
        }

    } catch (error) {
        console.error("Server Tracking Global Error:", error);
    }
};