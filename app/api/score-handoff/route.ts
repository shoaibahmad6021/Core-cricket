import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { matches, scoringHandoffs, tournamentScorers, tournaments } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { isCoreCricketAdmin } from "@/app/admin-auth";

export async function POST(request: Request) {
  const user=await getChatGPTUser();if(!user)return Response.json({error:"Sign in is required"},{status:401});const{matchId}=await request.json()as{matchId?:number};const db=getDb();const[match]=await db.select().from(matches).where(eq(matches.id,Number(matchId))).limit(1);if(!match||!match.tournamentId)return Response.json({error:"Tournament match not found"},{status:404});
  const[creator]=await db.select().from(tournaments).where(eq(tournaments.id,match.tournamentId)).limit(1);const officials=await db.select().from(tournamentScorers).where(eq(tournamentScorers.tournamentId,match.tournamentId));const email=user.email.toLowerCase();const name=(user.fullName||user.displayName).toLowerCase();const allowed=isCoreCricketAdmin(user)||creator?.createdByEmail.toLowerCase()===email||creator?.createdByName.toLowerCase()===name||officials.some((s)=>s.email.toLowerCase()===email||s.name.toLowerCase()===name);if(!allowed)return Response.json({error:"Only the tournament creator or an official scorer can transfer scoring"},{status:403});
  await db.update(scoringHandoffs).set({active:false}).where(eq(scoringHandoffs.matchId,match.id));const token=crypto.randomUUID().replaceAll("-","");await db.insert(scoringHandoffs).values({token,matchId:match.id,active:true});return Response.json({token,matchId:match.id});
}
export async function GET(request:Request){if(!(await getChatGPTUser()))return Response.json({error:"Sign in is required"},{status:401});const token=new URL(request.url).searchParams.get("token")??"";const[row]=await getDb().select().from(scoringHandoffs).where(and(eq(scoringHandoffs.token,token),eq(scoringHandoffs.active,true))).limit(1);if(!row)return Response.json({error:"Scoring transfer link is invalid or has been replaced"},{status:404});return Response.json({matchId:row.matchId});}
