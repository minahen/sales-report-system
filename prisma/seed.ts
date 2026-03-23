import { PrismaClient, Role, ReportStatus } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // ==========================================
  // ユーザー (users) の投入
  // ==========================================

  // パスワードをハッシュ化
  const passwordHash01 = await bcrypt.hash('Password01', 10)
  const passwordHash02 = await bcrypt.hash('Password02', 10)
  const passwordHash03 = await bcrypt.hash('Password03', 10)
  const passwordHash04 = await bcrypt.hash('Password04', 10)

  // USER-04（管理者）は上長なしのため先に作成
  const user04 = await prisma.user.upsert({
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
  const user03 = await prisma.user.upsert({
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
  const user01 = await prisma.user.upsert({
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
  const user02 = await prisma.user.upsert({
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

  const cust01 = await prisma.customer.upsert({
    where: { id: 'seed-cust-01-alpha' },
    update: {
      name: '株式会社アルファ',
      industry: '製造業',
      phone: '03-1111-1111',
    },
    create: {
      id: 'seed-cust-01-alpha',
      name: '株式会社アルファ',
      industry: '製造業',
      phone: '03-1111-1111',
    },
  })

  const cust02 = await prisma.customer.upsert({
    where: { id: 'seed-cust-02-beta' },
    update: {
      name: '株式会社ベータ',
      industry: 'IT',
      phone: '03-2222-2222',
    },
    create: {
      id: 'seed-cust-02-beta',
      name: '株式会社ベータ',
      industry: 'IT',
      phone: '03-2222-2222',
    },
  })

  const cust03 = await prisma.customer.upsert({
    where: { id: 'seed-cust-03-gamma' },
    update: {
      name: 'ガンマ商事',
      industry: '商社',
      phone: '06-3333-3333',
    },
    create: {
      id: 'seed-cust-03-gamma',
      name: 'ガンマ商事',
      industry: '商社',
      phone: '06-3333-3333',
    },
  })

  console.log('Customers seeded:', { cust01: cust01.name, cust02: cust02.name, cust03: cust03.name })

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
  // 日報 (daily_reports) と訪問記録 (visit_records) の投入
  // ==========================================

  // RPT-01: USER-01, 当日, draft, 訪問記録2件（CUST-01とCUST-02）
  const rpt01 = await prisma.dailyReport.upsert({
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

  // RPT-01の訪問記録を削除して再投入（冪等性のため）
  await prisma.visitRecord.deleteMany({
    where: { reportId: rpt01.id },
  })

  await prisma.visitRecord.createMany({
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
  const rpt02 = await prisma.dailyReport.upsert({
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

  await prisma.visitRecord.deleteMany({
    where: { reportId: rpt02.id },
  })

  await prisma.visitRecord.createMany({
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
  const rpt03 = await prisma.dailyReport.upsert({
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

  await prisma.visitRecord.deleteMany({
    where: { reportId: rpt03.id },
  })

  await prisma.visitRecord.createMany({
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
  // 既存コメントの削除と再投入（冪等性のため）
  await prisma.comment.deleteMany({
    where: { reportId: rpt03.id },
  })

  await prisma.comment.create({
    data: {
      reportId: rpt03.id,
      commenterId: user03.id,
      content: '株式会社ベータのヒアリング、よくできています。次回の提案に向けて資料の準備をお願いします。',
    },
  })

  // RPT-04: USER-02, 当日, submitted, 訪問記録1件（CUST-01）
  const rpt04 = await prisma.dailyReport.upsert({
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

  await prisma.visitRecord.deleteMany({
    where: { reportId: rpt04.id },
  })

  await prisma.visitRecord.createMany({
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
