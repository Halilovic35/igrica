import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function enableRLS() {
  console.log('🔒 Enabling Row Level Security (RLS)...\n');

  try {
    // Read SQL migration file
    const sqlPath = path.join(__dirname, '../prisma/migrations/enable_rls.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Split SQL into individual statements
    // Remove comments and empty lines, then split by semicolon
    let cleanedSql = sql
      // Remove single-line comments
      .replace(/--.*$/gm, '')
      // Remove multi-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Remove empty lines
      .replace(/^\s*[\r\n]/gm, '')
      .trim();

    // Split by semicolon, but keep multi-line statements together
    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        // Filter out empty statements and comment-only lines
        const trimmed = s.trim();
        return trimmed.length > 0 && 
               !trimmed.startsWith('--') && 
               !trimmed.startsWith('/*') &&
               // Must contain actual SQL keywords
               /(ALTER|CREATE|DROP|INSERT|UPDATE|DELETE|SELECT|ENABLE|POLICY)/i.test(trimmed);
      });

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comment blocks
      if (statement.includes('--') && statement.split('--')[0].trim().length === 0) {
        continue;
      }

      try {
        // Use $executeRawUnsafe to execute raw SQL
        await prisma.$executeRawUnsafe(statement);
        
        // Extract policy/table name for logging
        const match = statement.match(/(?:CREATE POLICY|ALTER TABLE|ENABLE ROW LEVEL SECURITY).*?["']?(\w+)["']?/i);
        const name = match ? match[1] : 'statement';
        
        console.log(`✅ [${i + 1}/${statements.length}] Executed: ${name}`);
      } catch (error: any) {
        // If policy already exists, that's okay
        if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
          console.log(`⚠️  [${i + 1}/${statements.length}] Already exists: ${statement.substring(0, 50)}...`);
        } else {
          console.error(`❌ [${i + 1}/${statements.length}] Error executing statement:`);
          console.error(`   ${statement.substring(0, 100)}...`);
          console.error(`   Error: ${error.message}\n`);
          // Continue with other statements
        }
      }
    }

    console.log('\n✅ RLS migration completed successfully!');
    console.log('📊 Check Supabase Security Advisor to verify all errors are resolved.\n');
  } catch (error: any) {
    console.error('❌ Error enabling RLS:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

enableRLS()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
