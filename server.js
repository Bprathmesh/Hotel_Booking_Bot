const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const dotenv = require('dotenv');
const { Sequelize, DataTypes } = require('sequelize');
const OpenAI = require("openai");
const cors = require('cors');

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Environment variables
const ROOMS_API = process.env.ROOMS_API || 'https://bot9assignement.deno.dev/rooms';
const BOOKING_API = process.env.BOOKING_API || 'https://bot9assignement.deno.dev/book';

// Database setup
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite'
});

const Conversation = sequelize.define('Conversation', {
    userId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    messages: {
        type: DataTypes.JSON,
        allowNull: false
    },
    bookingState: {
        type: DataTypes.JSON,
        allowNull: true
    }
});

sequelize.sync({ force: true }).then(() => {
    console.log('Database & tables created!');
});

// OpenAI configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Input validation middleware
const validateChatInput = (req, res, next) => {
    const { message, userId } = req.body;
    if (!message || !userId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    next();
};

// Routes
app.get('/', (req, res) => {
    res.send('Welcome to my hotel booking chatbot API.');
});

app.post('/chat', validateChatInput, async (req, res) => {
    const { message, userId } = req.body;

    try {
        // Fetch or create conversation
        let conversation = await Conversation.findOne({ where: { userId } });
        if (!conversation) {
            conversation = await Conversation.create({
                userId,
                messages: [],
                bookingState: {
                    stage: 'initial',
                    fullName: null,
                    email: null,
                    checkInDate: null,
                    nights: null,
                    selectedRoomId: null
                }
            });
        }

        // Add user message to conversation
        conversation.messages.push({ role: 'user', content: message });

        // Prepare system message based on booking state
        const systemMessage = generateSystemMessage(conversation.bookingState);

        // Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemMessage },
                ...conversation.messages
            ],
            functions: [
                {
                    name: "get_room_options",
                    description: "Get available room options from the hotel",
                    parameters: {
                        type: "object",
                        properties: {},
                        required: []
                    }
                },
                {
                    name: "book_room",
                    description: "Book a room at the hotel",
                    parameters: {
                        type: "object",
                        properties: {
                            roomId: { type: "number" },
                            fullName: { type: "string" },
                            email: { type: "string" },
                            checkInDate: { type: "string" },
                            nights: { type: "number" }
                        },
                        required: ["roomId", "fullName", "email", "checkInDate", "nights"]
                    }
                }
            ]
        });

        let aiResponse = completion.choices[0].message;

        // Handle function calls
        if (aiResponse.function_call) {
            const functionName = aiResponse.function_call.name;
            const functionArgs = JSON.parse(aiResponse.function_call.arguments);

            if (functionName === 'get_room_options') {
                const roomOptions = await axios.get(ROOMS_API);
                aiResponse = { role: 'function', content: JSON.stringify(roomOptions.data) };
            } else if (functionName === 'book_room') {
                const bookingResult = await axios.post(BOOKING_API, functionArgs);
                aiResponse = { role: 'function', content: JSON.stringify(bookingResult.data) };
                // Reset booking state after successful booking
                conversation.bookingState = {
                    stage: 'initial',
                    fullName: null,
                    email: null,
                    checkInDate: null,
                    nights: null,
                    selectedRoomId: null
                };
            }
        } else {
            // Update booking state based on AI response
            updateBookingState(conversation.bookingState, aiResponse.content);

            // Update booking stage
            updateBookingStage(conversation.bookingState);
        }

        // Add AI response to conversation and save
        conversation.messages.push(aiResponse);
        await conversation.save();

        res.json({ reply: aiResponse.content });
    } catch (error) {
        console.error('Error processing message:', error);
        if (error.response) {
            res.status(error.response.status).json({ error: error.response.data });
        } else if (error.request) {
            res.status(503).json({ error: 'Service unavailable' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

function generateSystemMessage(bookingState) {
    let systemMessage = `You are a helpful hotel booking assistant. The current booking state is: ${JSON.stringify(bookingState)}.
    Guide the user through the booking process in this order:
    1. Ask for their name, email, and check-in/check-out dates.
    2. Calculate the duration of stay.
    3. Show available room options.
    4. Confirm booking details.
    5. Complete the booking.
    
    Do not repeat information unnecessarily. Make sure the conversation is dynamic and smooth.`;

    if (bookingState.fullName) {
        systemMessage += ` The user's name is ${bookingState.fullName}.`;
    }
    if (bookingState.email) {
        systemMessage += ` The user's email is ${bookingState.email}.`;
    }
    if (bookingState.checkInDate) {
        systemMessage += ` The check-in date is ${bookingState.checkInDate}.`;
    }
    if (bookingState.nights) {
        systemMessage += ` The duration of stay is ${bookingState.nights} nights.`;
    }
    return systemMessage;
}

function updateBookingState(bookingState, content) {
    if (!bookingState.fullName) {
        bookingState.fullName = extractFullName(content);
    }
    if (!bookingState.email) {
        bookingState.email = extractEmail(content);
    }
    if (!bookingState.checkInDate) {
        bookingState.checkInDate = extractDate(content);
    }
    if (!bookingState.nights) {
        bookingState.nights = extractNights(content);
    }
    if (!bookingState.selectedRoomId) {
        bookingState.selectedRoomId = extractRoomId(content);
    }
}

function updateBookingStage(bookingState) {
    if (bookingState.fullName && bookingState.email && bookingState.checkInDate && bookingState.nights) {
        bookingState.stage = 'ready_to_book';
    } else if (bookingState.fullName || bookingState.email || bookingState.checkInDate || bookingState.nights) {
        bookingState.stage = 'collecting_info';
    } else {
        bookingState.stage = 'initial';
    }
}

function extractFullName(content) {
    const fullNameMatch = content.match(/My name is (.*)|I am (.*)/);
    if (fullNameMatch) {
        return fullNameMatch[1].trim();
    }
    return null;
}

function extractEmail(content) {
    const emailMatch = content.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
        return emailMatch[1];
    }
    return null;
}

function extractDate(content) {
    const dateMatch = content.match(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/);
    if (dateMatch) {
        return dateMatch[0];
    }
    return null;
}

function extractNights(content) {
    const nightsMatch = content.match(/\d+ night(s)?/);
    if (nightsMatch) {
        return parseInt(nightsMatch[0]);
    }
    return null;
}

function extractRoomId(content) {
    const roomIdMatch = content.match(/room (\d+)/);
    if (roomIdMatch) {
        return parseInt(roomIdMatch[1]);
    }
    return null;
}

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
