import Form from '@/app/ui/customers/create-form';
import Breadcrumbs from '@/app/ui/invoices/breadcrumbs';

export default function Page() {
  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Customers', href: '/ui/customers' },
          {
            label: 'Create Customer',
            href: '/ui/customers/create',
            active: true,
          },
        ]}
      />
      <Form />
    </main>
  );
}
