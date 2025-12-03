import jwt from "jsonwebtoken"

const secretKey = "your_secret_key_here" // Example secret key, replace with actual key

// Function to generate a JWT token
function generateToken(payload: any): string {
  return jwt.sign(payload, secretKey, { expiresIn: "1h" }) // Token expires in 1 hour
}

// Function to verify a JWT token
function verifyToken(token: string): any {
  try {
    return jwt.verify(token, secretKey)
  } catch (err) {
    throw new Error("Invalid token")
  }
}

// Export functions for use in other modules
export { generateToken, verifyToken }
