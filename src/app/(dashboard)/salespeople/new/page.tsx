import SalespersonForm from '@/components/common/SalespersonForm'

export default function NewSalespersonPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">新規担当者登録</h1>
      <SalespersonForm mode="create" />
    </div>
  )
}
