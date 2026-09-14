import CustomersTable from '@/app/ui/customers/table';
import { fetchFilteredCustomers } from '@/app/lib/data';

export default async function Page({ searchParams }) {
  const params = await searchParams;
  const query = params?.query || '';
  const customers = await fetchFilteredCustomers(query);

  return <CustomersTable customers={customers} />;
}
