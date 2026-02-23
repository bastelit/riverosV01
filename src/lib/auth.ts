import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = "riveros_token";
const EXPIRY = "24h";

export interface JWTPayload {
  email: string;
  name: string;
  vessel: string;
  vesselAbbr: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
