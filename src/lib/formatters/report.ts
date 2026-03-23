export type ReportForFormat = {
  id: string
  reportDate: Date
  status: string
  problem: string | null
  plan: string | null
  createdAt: Date
  updatedAt: Date
  salesperson: { id: string; name: string }
  visitRecords: Array<{
    id: string
    order: number
    customer: { id: string; name: string }
    visitContent: string
    visitedAt: string | null
    createdAt: Date
  }>
  comments: Array<{
    id: string
    content: string
    commenter: { id: string; name: string }
    createdAt: Date
    updatedAt: Date
  }>
}

export function formatReport(report: ReportForFormat) {
  return {
    id: report.id,
    report_date: report.reportDate.toISOString().split('T')[0],
    status: report.status,
    problem: report.problem,
    plan: report.plan,
    salesperson: report.salesperson,
    visit_records: report.visitRecords.map((vr) => ({
      id: vr.id,
      order: vr.order,
      customer: vr.customer,
      visit_content: vr.visitContent,
      visited_at: vr.visitedAt,
      created_at: vr.createdAt.toISOString(),
    })),
    comments: report.comments.map((c) => ({
      id: c.id,
      content: c.content,
      commenter: c.commenter,
      created_at: c.createdAt.toISOString(),
      updated_at: c.updatedAt.toISOString(),
    })),
    created_at: report.createdAt.toISOString(),
    updated_at: report.updatedAt.toISOString(),
  }
}
