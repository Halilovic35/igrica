import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRLSStatus() {
  console.log('🔍 Checking Row Level Security (RLS) status...\n');

  try {
    // Check RLS status on all tables
    const tables = [
      'users',
      'avatars',
      'user_items',
      'user_stats',
      'user_level_progress',
      'levels',
      'items',
      '_prisma_migrations',
    ];

    for (const table of tables) {
      try {
        const result = await prisma.$queryRawUnsafe<Array<{ relname: string; relrowsecurity: boolean }>>(
          `SELECT relname, relrowsecurity FROM pg_class WHERE relname = $1`,
          table
        );

        if (result.length > 0) {
          const isEnabled = result[0].relrowsecurity;
          const status = isEnabled ? '✅ ENABLED' : '❌ DISABLED';
          console.log(`${status} - ${table}`);
        } else {
          console.log(`⚠️  NOT FOUND - ${table}`);
        }
      } catch (error: any) {
        console.log(`❌ ERROR checking ${table}: ${error.message}`);
      }
    }

    // Check policies
    console.log('\n📋 Checking RLS Policies:\n');
    
    const policies = await prisma.$queryRawUnsafe<Array<{ schemaname: string; tablename: string; policyname: string }>>(
      `SELECT schemaname, tablename, policyname 
       FROM pg_policies 
       WHERE schemaname = 'public' 
       ORDER BY tablename, policyname`
    );

    if (policies.length === 0) {
      console.log('⚠️  No policies found');
    } else {
      const policiesByTable = policies.reduce((acc, policy) => {
        if (!acc[policy.tablename]) {
          acc[policy.tablename] = [];
        }
        acc[policy.tablename].push(policy.policyname);
        return acc;
      }, {} as Record<string, string[]>);

      for (const [table, policyNames] of Object.entries(policiesByTable)) {
        console.log(`📌 ${table}:`);
        policyNames.forEach(name => {
          console.log(`   ✅ ${name}`);
        });
        console.log('');
      }
    }

    console.log(`\n✅ Found ${policies.length} total policies`);
    console.log('📊 Check Supabase Security Advisor for detailed status.\n');
  } catch (error: any) {
    console.error('❌ Error checking RLS status:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkRLSStatus()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
