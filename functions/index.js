const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const cors = require("cors")({ origin: true });

admin.initializeApp();
const db = admin.firestore();

// ==============================================
// BEDS24 API CONFIGURATION
// ==============================================
const BEDS24_API_URL = "https://api.beds24.com/v2";
const BEDS24_TOKEN = "P7NdwaPR1swPikqZ88HqPV2Tvw5gMMuVQUNq/Hl+VwMdqRjWAnooAYWGdqh8qj7CYw3ko70oyxDOc9Qzhoe2wJg7zaDjJTiAjwqUp6Y2Q+xM3gKnouEtNzXscKYfHif4HT87dmyYNlnvZE662VoAgQ==";

// ==============================================
// RESEND EMAIL CONFIGURATION
// ==============================================
const RESEND_API_KEY = "re_7ajvEJXh_HQnFkKe5VYNPfbR7BaGfgpFZ";
const ADMIN_EMAIL = "martin@masiacanpares.com";

async function sendEmail(to, subject, html) {
    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: "Masia Can Pares <onboarding@resend.dev>",
                to: to,
                subject: subject,
                html: html
            })
        });
        const result = await response.json();
        console.log("Email sent:", result);
        return result;
    } catch (error) {
        console.error("Email error:", error);
        return null;
    }
}

// ==============================================
// HELPER: Beds24 API Call
// ==============================================
async function beds24Request(endpoint, method = "GET", body = null) {
    const options = {
        method: method,
        headers: {
            "Content-Type": "application/json",
            "token": BEDS24_TOKEN
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BEDS24_API_URL}${endpoint}`, options);
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Beds24 API Error: ${response.status} - ${error}`);
    }
    
    return response.json();
}

// ==============================================
// FUNCTION: Get Properties from Beds24
// ==============================================
exports.getProperties = functions.region("europe-west1").https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            const properties = await beds24Request("/properties");
            res.json({ success: true, properties: properties });
        } catch (error) {
            console.error("Error fetching properties:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
});

// ==============================================
// FUNCTION: Get Bookings from Beds24
// ==============================================
exports.getBookings = functions.region("europe-west1").https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            // Get bookings from last 30 days to next 90 days
            const today = new Date();
            const pastDate = new Date(today);
            pastDate.setDate(pastDate.getDate() - 30);
            const futureDate = new Date(today);
            futureDate.setDate(futureDate.getDate() + 90);
            
            const arrivalFrom = pastDate.toISOString().split("T")[0];
            const arrivalTo = futureDate.toISOString().split("T")[0];
            
            const bookings = await beds24Request(`/bookings?arrivalFrom=${arrivalFrom}&arrivalTo=${arrivalTo}`);
            res.json({ success: true, bookings: bookings });
        } catch (error) {
            console.error("Error fetching bookings:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
});

// ==============================================
// PROPERTY MAPPING
// ==============================================
const PROPERTY_MAP = {
    306071: "Casa Blanca",
    306072: "Casa Mediterranea"
};

function getPropertyName(propertyId) {
    return PROPERTY_MAP[propertyId] || "Unknown";
}

function calculateNights(arrival, departure) {
    if (!arrival || !departure) return 1;
    const start = new Date(arrival);
    const end = new Date(departure);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
}

// ==============================================
// FUNCTION: Sync Bookings to Firestore
// ==============================================
exports.syncBookings = functions.region("europe-west1").https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            // Get bookings from Beds24
            const today = new Date();
            const pastDate = new Date(today);
            pastDate.setDate(pastDate.getDate() - 7);
            const futureDate = new Date(today);
            futureDate.setDate(futureDate.getDate() + 180);
            
            const arrivalFrom = pastDate.toISOString().split("T")[0];
            const arrivalTo = futureDate.toISOString().split("T")[0];
            
            const bookingsResponse = await beds24Request(`/bookings?arrivalFrom=${arrivalFrom}&arrivalTo=${arrivalTo}`);
            const bookings = bookingsResponse.data || bookingsResponse;
            
            let synced = 0;
            let created = 0;
            
            for (const booking of bookings) {
                const bookingId = `beds24_${booking.id}`;
                const bookingRef = db.collection("bookings").doc(bookingId);
                const existing = await bookingRef.get();
                
                // Map Beds24 data to your format
                const arrival = booking.arrival || booking.firstNight;
                const departure = booking.departure || booking.lastNight;
                
                const bookingData = {
                    beds24Id: booking.id,
                    guestName: `${booking.firstName || ""} ${booking.lastName || ""}`.trim() || "Guest",
                    guestEmail: booking.email || "",
                    guestPhone: booking.phone || booking.mobile || "",
                    property: getPropertyName(booking.propertyId),
                    propertyId: booking.propertyId,
                    checkIn: arrival,
                    checkOut: departure,
                    nights: calculateNights(arrival, departure),
                    guests: (booking.numAdult || 1) + (booking.numChild || 0),
                    totalPrice: parseFloat(booking.price) || 0,
                    status: mapBeds24Status(booking.status),
                    source: booking.referer || booking.apiSource || "Direct",
                    notes: booking.notes || "",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    syncedFromBeds24: true
                };
                
                if (!existing.exists) {
                    bookingData.createdAt = admin.firestore.FieldValue.serverTimestamp();
                    created++;
                }
                
                await bookingRef.set(bookingData, { merge: true });
                synced++;
            }
            
            res.json({ 
                success: true, 
                message: `Synced ${synced} bookings (${created} new)`,
                total: synced,
                created: created
            });
        } catch (error) {
            console.error("Error syncing bookings:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
});

// ==============================================
// FUNCTION: Webhook for Beds24 Notifications
// ==============================================
exports.beds24Webhook = functions.region("europe-west1").https.onRequest(async (req, res) => {
    try {
        console.log("Beds24 Webhook received:", JSON.stringify(req.body));
        
        const data = req.body;
        
        if (data.bookingId) {
            // Fetch full booking details
            const booking = await beds24Request(`/bookings/${data.bookingId}`);
            
            const bookingId = `beds24_${data.bookingId}`;
            const arrival = booking.arrival || booking.firstNight;
            const departure = booking.departure || booking.lastNight;
            
            const bookingData = {
                beds24Id: data.bookingId,
                guestName: `${booking.firstName || ""} ${booking.lastName || ""}`.trim() || "Guest",
                guestEmail: booking.email || "",
                guestPhone: booking.phone || booking.mobile || "",
                property: getPropertyName(booking.propertyId),
                propertyId: booking.propertyId,
                checkIn: arrival,
                checkOut: departure,
                nights: calculateNights(arrival, departure),
                guests: (booking.numAdult || 1) + (booking.numChild || 0),
                totalPrice: parseFloat(booking.price) || 0,
                status: mapBeds24Status(booking.status),
                source: booking.referer || booking.apiSource || "Direct",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                syncedFromBeds24: true
            };
            
            const bookingRef = db.collection("bookings").doc(bookingId);
            const existing = await bookingRef.get();
            
            if (!existing.exists) {
                bookingData.createdAt = admin.firestore.FieldValue.serverTimestamp();
                
                // Create guest account if email exists
                if (booking.email) {
                    await createGuestAccount(booking);
                }
            }
            
            await bookingRef.set(bookingData, { merge: true });
            
            console.log(`Booking ${bookingId} synced from webhook`);
        }
        
        res.status(200).send("OK");
    } catch (error) {
        console.error("Webhook error:", error);
        res.status(500).send("Error processing webhook");
    }
});

// ==============================================
// HELPER: Map Beds24 status to your status
// ==============================================
function mapBeds24Status(beds24Status) {
    const statusMap = {
        "new": "confirmed",
        "confirmed": "confirmed",
        "cancelled": "cancelled",
        "request": "pending",
        "black": "blocked"
    };
    return statusMap[beds24Status?.toLowerCase()] || "confirmed";
}

// ==============================================
// HELPER: Create guest account for new booking
// ==============================================
async function createGuestAccount(booking) {
    try {
        const email = booking.email;
        if (!email) return null;
        
        // Check if user already exists
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(email);
            console.log(`User ${email} already exists`);
        } catch (e) {
            // User doesn't exist, create new one
            const tempPassword = generateTempPassword();
            userRecord = await admin.auth().createUser({
                email: email,
                password: tempPassword,
                displayName: `${booking.firstName || ""} ${booking.lastName || ""}`.trim() || "Guest"
            });
            
            console.log(`Created new user ${email}`);
            
            // Store temp password for welcome email (you'd send this via email)
            await db.collection("pending-welcomes").doc(userRecord.uid).set({
                email: email,
                name: userRecord.displayName,
                tempPassword: tempPassword,
                bookingId: booking.id,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        
        return userRecord;
    } catch (error) {
        console.error("Error creating guest account:", error);
        return null;
    }
}

// ==============================================
// HELPER: Generate temporary password
// ==============================================
function generateTempPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// ==============================================
// SCHEDULED: Auto-sync every 6 hours
// ==============================================
exports.scheduledSync = functions.region("europe-west1").pubsub
    .schedule("every 6 hours")
    .timeZone("Europe/Madrid")
    .onRun(async (context) => {
        try {
            console.log("Starting scheduled Beds24 sync...");
            
            const today = new Date();
            const pastDate = new Date(today);
            pastDate.setDate(pastDate.getDate() - 7);
            const futureDate = new Date(today);
            futureDate.setDate(futureDate.getDate() + 180);
            
            const arrivalFrom = pastDate.toISOString().split("T")[0];
            const arrivalTo = futureDate.toISOString().split("T")[0];
            
            const bookingsResponse = await beds24Request(`/bookings?arrivalFrom=${arrivalFrom}&arrivalTo=${arrivalTo}`);
            const bookings = bookingsResponse.data || bookingsResponse;
            
            let synced = 0;
            for (const booking of bookings) {
                const bookingId = `beds24_${booking.id}`;
                const arrival = booking.arrival || booking.firstNight;
                const departure = booking.departure || booking.lastNight;
                
                const bookingData = {
                    beds24Id: booking.id,
                    guestName: `${booking.firstName || ""} ${booking.lastName || ""}`.trim() || "Guest",
                    guestEmail: booking.email || "",
                    guestPhone: booking.phone || booking.mobile || "",
                    property: getPropertyName(booking.propertyId),
                    propertyId: booking.propertyId,
                    checkIn: arrival,
                    checkOut: departure,
                    nights: calculateNights(arrival, departure),
                    guests: (booking.numAdult || 1) + (booking.numChild || 0),
                    totalPrice: parseFloat(booking.price) || 0,
                    status: mapBeds24Status(booking.status),
                    source: booking.referer || booking.apiSource || "Direct",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    syncedFromBeds24: true
                };
                
                await db.collection("bookings").doc(bookingId).set(bookingData, { merge: true });
                synced++;
            }
            
            console.log(`Scheduled sync completed: ${synced} bookings`);
            return null;
        } catch (error) {
            console.error("Scheduled sync error:", error);
            return null;
        }
    });

// ==============================================
// TRIGGER: New Service Order → Email Admin
// ==============================================
exports.onNewServiceOrder = functions.region("europe-west1").firestore
    .document("service-orders/{orderId}")
    .onCreate(async (snap, context) => {
        const order = snap.data();
        
        const subject = `🛎️ New Service Order: ${order.serviceName}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #722F37; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">New Service Order</h1>
                </div>
                <div style="padding: 30px; background: #f9f9f9;">
                    <h2 style="color: #722F37; margin-top: 0;">📋 Order Details</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Service:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${order.serviceName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Guest:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${order.guestName || 'Guest'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${order.guestEmail || '-'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Date:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${order.serviceDate ? new Date(order.serviceDate.toDate()).toLocaleDateString() : '-'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Time:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${order.serviceTime || '-'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Quantity:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${order.quantity || 1}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Total:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd; font-size: 1.2em; color: #722F37;"><strong>€${order.total || 0}</strong></td>
                        </tr>
                        ${order.notes ? `
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Notes:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${order.notes}</td>
                        </tr>
                        ` : ''}
                    </table>
                    
                    <div style="margin-top: 30px; text-align: center;">
                        <a href="https://martinoh-ai.github.io/cp/admin-dashboard.html" style="background: #722F37; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            View in Dashboard
                        </a>
                    </div>
                </div>
                <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
                    Masia Can Pares - Guest Services
                </div>
            </div>
        `;
        
        await sendEmail(ADMIN_EMAIL, subject, html);
        console.log(`Service order notification sent for order ${context.params.orderId}`);
        return null;
    });

// ==============================================
// TRIGGER: New Message → Email Admin
// ==============================================
exports.onNewMessage = functions.region("europe-west1").firestore
    .document("conversations/{convoId}/messages/{messageId}")
    .onCreate(async (snap, context) => {
        const message = snap.data();
        
        // Only notify for guest messages, not admin replies
        if (message.senderType === "host") return null;
        
        // Get conversation details
        const convoDoc = await db.collection("conversations").doc(context.params.convoId).get();
        const convo = convoDoc.data();
        
        const subject = `💬 New Message from ${convo?.guestName || 'Guest'}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #2D4A3E; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">New Guest Message</h1>
                </div>
                <div style="padding: 30px; background: #f9f9f9;">
                    <p><strong>From:</strong> ${convo?.guestName || 'Guest'}</p>
                    <p><strong>Email:</strong> ${convo?.guestEmail || '-'}</p>
                    
                    <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #2D4A3E;">
                        <p style="margin: 0; white-space: pre-wrap;">${message.text}</p>
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="https://martinoh-ai.github.io/cp/admin-dashboard.html" style="background: #2D4A3E; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Reply in Dashboard
                        </a>
                    </div>
                </div>
                <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
                    Masia Can Pares - Guest Messages
                </div>
            </div>
        `;
        
        await sendEmail(ADMIN_EMAIL, subject, html);
        console.log(`Message notification sent for ${context.params.convoId}`);
        return null;
    });

// ==============================================
// TRIGGER: New Booking → Email Admin
// ==============================================
exports.onNewBooking = functions.region("europe-west1").firestore
    .document("bookings/{bookingId}")
    .onCreate(async (snap, context) => {
        const booking = snap.data();
        
        // Only for Beds24 synced bookings
        if (!booking.syncedFromBeds24) return null;
        
        const checkIn = booking.checkIn?.toDate ? booking.checkIn.toDate() : new Date(booking.checkIn);
        const checkOut = booking.checkOut?.toDate ? booking.checkOut.toDate() : new Date(booking.checkOut);
        
        const subject = `🏠 New Booking: ${booking.guestName || 'Guest'} - ${booking.property}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #E9B84A; color: #333; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">New Reservation!</h1>
                </div>
                <div style="padding: 30px; background: #f9f9f9;">
                    <h2 style="color: #722F37; margin-top: 0;">📅 Booking Details</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Guest:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.guestName || 'Guest'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.guestEmail || '-'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Phone:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.guestPhone || '-'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Property:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.property}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Check-in:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${checkIn.toLocaleDateString()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Check-out:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${checkOut.toLocaleDateString()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Nights:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.nights || '-'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Guests:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.guests || '-'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Total:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd; font-size: 1.2em; color: #2D4A3E;"><strong>€${booking.totalPrice || 0}</strong></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Source:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.source || 'Direct'}</td>
                        </tr>
                    </table>
                    
                    <div style="margin-top: 30px; text-align: center;">
                        <a href="https://martinoh-ai.github.io/cp/admin-dashboard.html" style="background: #722F37; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            View in Dashboard
                        </a>
                    </div>
                </div>
                <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
                    Masia Can Pares - Reservations
                </div>
            </div>
        `;
        
        await sendEmail(ADMIN_EMAIL, subject, html);
        console.log(`Booking notification sent for ${context.params.bookingId}`);
        return null;
    });

// ==============================================
// TRIGGER: New Newsletter Subscription
// ==============================================
exports.onNewSubscription = functions.region("europe-west1").firestore
    .document("newsletter/{subscriptionId}")
    .onCreate(async (snap, context) => {
        const subscription = snap.data();
        
        const subject = `📬 New Newsletter Subscription`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #722F37; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">New Subscriber!</h1>
                </div>
                <div style="padding: 30px; background: #f9f9f9;">
                    <p style="font-size: 1.1em; margin-bottom: 20px;">Someone just subscribed to your newsletter:</p>
                    
                    <div style="background: white; padding: 20px; border-radius: 10px; border-left: 4px solid #E9B84A;">
                        <p style="margin: 0; font-size: 1.2em;"><strong>${subscription.email}</strong></p>
                    </div>
                    
                    <p style="margin-top: 20px; color: #666; font-size: 0.9em;">
                        Source: ${subscription.source || 'Website'}<br>
                        Date: ${new Date().toLocaleDateString()}
                    </p>
                </div>
                <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
                    Masia Can Pares - Newsletter
                </div>
            </div>
        `;
        
        await sendEmail(ADMIN_EMAIL, subject, html);
        console.log(`Newsletter notification sent for ${subscription.email}`);
        return null;
    });
