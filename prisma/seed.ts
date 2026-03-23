import { PrismaClient, Role, ReportStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// 顧客マスタのシードID（固定UUID形式で冪等性を確保）
const SEED_CUSTOMER_IDS = {
  CUST_01: '00000000-0000-0000-0001-000000000001',
  CUST_02: '00000000-0000-0000-0001-000000000002',
  CUST_03: '00000000-0000-0000-0001-000000000003',
}

async function main() {
  console.log('Seeding database...')

  // パスワードをハッシュ化（トランザクション外で事前計算）
  const passwordHash01 = await bcrypt.hash('Password01', 10)
  const passwordHash02 = await bcrypt.hash('Password02', 10)
  const passwordHash03 = await bcrypt.hash('Password03', 10)
  const passwordHash04 = await bcrypt.hash('Password04', 10)

  // ==========================================
  // 日付の計算
  // ==========================================

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const dayBeforeYesterday = new Date(today)
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2)

  // ==========================================
  // トランザクションで全データを投入（途中失敗時にロールバック）
  // ==========================================

  await prisma.$transaction(async (tx) => {
    // ==========================================
    // ユーザー (users) の投入
    // ==========================================

    // USER-04（管理者）は上長なしのため先に作成
    const user04 = await tx.user.upsert({
      where: { email: 'sato@example.com' },
      update: {
        name: '佐藤 管理',
        passwordHash: passwordHash04,
        role: Role.admin,
        managerId: null,
      },
      create: {
        name: '佐藤 管理',
        email: 'sato@example.com',
        passwordHash: passwordHash04,
        role: Role.admin,
        managerId: null,
      },
    })

    // USER-03（上長）: 上長=USER-04
    const user03 = await tx.user.upsert({
      where: { email: 'yamada@example.com' },
      update: {
        name: '山田 一郎',
        passwordHash: passwordHash03,
        role: Role.manager,
        managerId: user04.id,
      },
      create: {
        name: '山田 一郎',
        email: 'yamada@example.com',
        passwordHash: passwordHash03,
        role: Role.manager,
        managerId: user04.id,
      },
    })

    // USER-01（営業）: 上長=USER-03
    const user01 = await tx.user.upsert({
      where: { email: 'tanaka@example.com' },
      update: {
        name: '田中 太郎',
        passwordHash: passwordHash01,
        role: Role.salesperson,
        managerId: user03.id,
      },
      create: {
        name: '田中 太郎',
        email: 'tanaka@example.com',
        passwordHash: passwordHash01,
        role: Role.salesperson,
        managerId: user03.id,
      },
    })

    // USER-02（営業）: 上長=USER-03
    const user02 = await tx.user.upsert({
      where: { email: 'suzuki@example.com' },
      update: {
        name: '鈴木 花子',
        passwordHash: passwordHash02,
        role: Role.salesperson,
        managerId: user03.id,
      },
      create: {
        name: '鈴木 花子',
        email: 'suzuki@example.com',
        passwordHash: passwordHash02,
        role: Role.salesperson,
        managerId: user03.id,
      },
    })

    console.log('Users seeded:', { user01: user01.email, user02: user02.email, user03: user03.email, user04: user04.email })

    // ==========================================
    // 顧客 (customers) の投入
    // ==========================================

    const cust01 = await tx.customer.upsert({
      where: { id: SEED_CUSTOMER_IDS.CUST_01 },
      update: {
        name: '株式会社アルファ',
        industry: '製造業',
        phone: '03-1111-1111',
      },
      create: {
        id: SEED_CUSTOMER_IDS.CUST_01,
        name: '株式会社アルファ',
        industry: '製造業',
        phone: '03-1111-1111',
      },
    })

    const cust02 = await tx.customer.upsert({
      where: { id: SEED_CUSTOMER_IDS.CUST_02 },
      update: {
        name: '株式会社ベータ',
        industry: 'IT',
        phone: '03-2222-2222',
      },
      create: {
        id: SEED_CUSTOMER_IDS.CUST_02,
        name: '株式会社ベータ',
        industry: 'IT',
        phone: '03-2222-2222',
      },
    })

    // CUST-03: 顧客マスタのテストデータ（test_spec_01_ui.md §2-2）
    // 顧客一覧・検索テスト（CUST-001〜004）や顧客登録テスト（CUST-010）で参照される
    const cust03 = await tx.customer.upsert({
      where: { id: SEED_CUSTOMER_IDS.CUST_03 },
      update: {
        name: 'ガンマ商事',
        industry: '商社',
        phone: '06-3333-3333',
      },
      create: {
        id: SEED_CUSTOMER_IDS.CUST_03,
        name: 'ガンマ商事',
        industry: '商社',
        phone: '06-3333-3333',
      },
    })

    console.log('Customers seeded:', { cust01: cust01.name, cust02: cust02.name, cust03: cust03.name })

    // ==========================================
    // 日報 (daily_reports) と訪問記録 (visit_records) の投入
    // ==========================================

    // RPT-01: USER-01, 当日, draft, 訪問記録2件（CUST-01とCUST-02）
    const rpt01 = await tx.dailyReport.upsert({
      where: {
        salespersonId_reportDate: {
          salespersonId: user01.id,
          reportDate: today,
        },
      },
      update: {
        status: ReportStatus.draft,
        problem: '株式会社アルファの担当者が来月異動予定。フォロー方法を検討中。',
        plan: '株式会社ベータへの提案資料を作成する。',
      },
      create: {
        salespersonId: user01.id,
        reportDate: today,
        status: ReportStatus.draft,
        problem: '株式会社アルファの担当者が来月異動予定。フォロー方法を検討中。',
        plan: '株式会社ベータへの提案資料を作成する。',
      },
    })

    await tx.visitRecord.deleteMany({ where: { reportId: rpt01.id } })
    await tx.visitRecord.createMany({
      data: [
        {
          reportId: rpt01.id,
          customerId: cust01.id,
          visitContent: '新製品の提案を実施。担当者に資料を渡した。',
          visitedAt: '10:00',
          order: 1,
        },
        {
          reportId: rpt01.id,
          customerId: cust02.id,
          visitContent: '課題ヒアリングを実施。来週フォローアップ予定。',
          visitedAt: '14:00',
          order: 2,
        },
      ],
    })

    // RPT-02: USER-01, 前日, submitted, 訪問記録1件（CUST-01）
    const rpt02 = await tx.dailyReport.upsert({
      where: {
        salespersonId_reportDate: {
          salespersonId: user01.id,
          reportDate: yesterday,
        },
      },
      update: {
        status: ReportStatus.submitted,
        problem: '価格交渉の進め方について上長に相談したい。',
        plan: '株式会社アルファへの見積書を作成する。',
      },
      create: {
        salespersonId: user01.id,
        reportDate: yesterday,
        status: ReportStatus.submitted,
        problem: '価格交渉の進め方について上長に相談したい。',
        plan: '株式会社アルファへの見積書を作成する。',
      },
    })

    await tx.visitRecord.deleteMany({ where: { reportId: rpt02.id } })
    await tx.visitRecord.createMany({
      data: [
        {
          reportId: rpt02.id,
          customerId: cust01.id,
          visitContent: '定期訪問。現状の課題と来期の計画についてヒアリングを実施。',
          visitedAt: '11:00',
          order: 1,
        },
      ],
    })

    // RPT-03: USER-01, 前々日, reviewed, コメントあり（USER-03からのコメント）、訪問記録1件（CUST-02）
    const rpt03 = await tx.dailyReport.upsert({
      where: {
        salespersonId_reportDate: {
          salespersonId: user01.id,
          reportDate: dayBeforeYesterday,
        },
      },
      update: {
        status: ReportStatus.reviewed,
        problem: null,
        plan: '次回の提案内容を具体化する。',
      },
      create: {
        salespersonId: user01.id,
        reportDate: dayBeforeYesterday,
        status: ReportStatus.reviewed,
        problem: null,
        plan: '次回の提案内容を具体化する。',
      },
    })

    await tx.visitRecord.deleteMany({ where: { reportId: rpt03.id } })
    await tx.visitRecord.createMany({
      data: [
        {
          reportId: rpt03.id,
          customerId: cust02.id,
          visitContent: 'システム導入についての詳細ヒアリング。担当者のニーズを把握した。',
          visitedAt: '15:00',
          order: 1,
        },
      ],
    })

    // RPT-03のコメント（USER-03からのコメント）
    await tx.comment.deleteMany({ where: { reportId: rpt03.id } })
    await tx.comment.create({
      data: {
        reportId: rpt03.id,
        commenterId: user03.id,
        content: '株式会社ベータのヒアリング、よくできています。次回の提案に向けて資料の準備をお願いします。',
      },
    })

    // RPT-04: USER-02, 当日, submitted, 訪問記録1件（CUST-01）
    const rpt04 = await tx.dailyReport.upsert({
      where: {
        salespersonId_reportDate: {
          salespersonId: user02.id,
          reportDate: today,
        },
      },
      update: {
        status: ReportStatus.submitted,
        problem: null,
        plan: '株式会社アルファのフォローアップを実施する。',
      },
      create: {
        salespersonId: user02.id,
        reportDate: today,
        status: ReportStatus.submitted,
        problem: null,
        plan: '株式会社アルファのフォローアップを実施する。',
      },
    })

    await tx.visitRecord.deleteMany({ where: { reportId: rpt04.id } })
    await tx.visitRecord.createMany({
      data: [
        {
          reportId: rpt04.id,
          customerId: cust01.id,
          visitContent: '契約更新の打ち合わせ。条件面での合意が取れた。',
          visitedAt: '13:00',
          order: 1,
        },
      ],
    })

    console.log('Daily reports seeded:', {
      rpt01: `${rpt01.id} (draft, today)`,
      rpt02: `${rpt02.id} (submitted, yesterday)`,
      rpt03: `${rpt03.id} (reviewed, day before yesterday)`,
      rpt04: `${rpt04.id} (submitted, today, user02)`,
    })
  })

  console.log('Seeding completed successfully.')
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
