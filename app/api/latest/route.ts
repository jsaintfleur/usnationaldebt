import {NextResponse} from "next/server";import {latest} from "@/lib/data";export const revalidate=3600;export function GET(){return NextResponse.json({data:latest(),meta:{cached:true,units:"USD"}})}
