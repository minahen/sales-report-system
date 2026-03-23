import CustomerForm from '@/components/common/CustomerForm'

export default function NewCustomerPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">新規顧客登録</h1>
      <CustomerForm mode="create" />
    </div>
  )
}
