// db.js — Prisma クライアントのシングルトン
// 複数ファイルから import しても接続が1本になる
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
