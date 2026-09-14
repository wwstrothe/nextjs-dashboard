'use server';
import { AuthError } from 'next-auth';
import { signIn } from '../../../auth';
import { neon } from '@neondatabase/serverless';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const sql = neon(process.env.DATABASE_URL);

const InvoiceSchema = z.object({
  customerId: z.string({ invalid_type_error: 'Please select a customer.' }).min(1, 'Please select a customer.'),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid', 'late'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
});

const CreateInvoice = InvoiceSchema;
const UpdateInvoice = InvoiceSchema;

export async function createInvoice(prevState, formData) {
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = Math.round(amount * 100);
  const date = new Date().toISOString().split('T')[0];

  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    console.error('Database Error:', error);
    return { message: 'Database Error: Failed to Create Invoice.' };
  }

  revalidatePath('/ui/invoices');
  redirect('/ui/invoices');
}

export async function updateInvoice(id, prevState, formData) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = Math.round(amount * 100);

  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
  } catch (error) {
    console.error('Database Error:', error);
    return { message: 'Database Error: Failed to Update Invoice.' };
  }

  revalidatePath('/ui/invoices');
  redirect('/ui/invoices');
}

export async function deleteInvoice(id) {
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/ui/invoices');
    return { message: 'Deleted Invoice.' };
  } catch (error) {
    console.error('Database Error:', error);
    return { message: 'Database Error: Failed to Delete Invoice.' };
  }
}

const CustomerSchema = z.object({
  name: z.string().trim().min(1, { message: 'Please enter a name.' }),
  email: z
    .string()
    .trim()
    .min(1, { message: 'Please enter an email.' })
    .email({ message: 'Please enter a valid email.' }),
});

const DEFAULT_CUSTOMER_IMAGE = '/customers/placeholder.png';

export async function createCustomer(prevState, formData) {
  const validatedFields = CustomerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Customer.',
    };
  }

  const { name, email } = validatedFields.data;

  try {
    await sql`
      INSERT INTO customers (name, email, image_url)
      VALUES (${name}, ${email}, ${DEFAULT_CUSTOMER_IMAGE})
    `;
  } catch (error) {
    console.error('Database Error:', error);
    return { message: 'Database Error: Failed to Create Customer.' };
  }

  revalidatePath('/ui/customers');
  redirect('/ui/customers');
}

export async function updateCustomer(id, prevState, formData) {
  const validatedFields = CustomerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Customer.',
    };
  }

  const { name, email } = validatedFields.data;

  try {
    await sql`
      UPDATE customers
      SET name = ${name}, email = ${email}
      WHERE id = ${id}
    `;
  } catch (error) {
    console.error('Database Error:', error);
    return { message: 'Database Error: Failed to Update Customer.' };
  }

  revalidatePath('/ui/customers');
  redirect('/ui/customers');
}

export async function deleteCustomer(id) {
  try {
    const invoices = await sql`
      SELECT id FROM invoices WHERE customer_id = ${id} LIMIT 1
    `;

    if (invoices.length > 0) {
      return {
        message:
          'Cannot delete customer: they still have invoices. Delete their invoices first.',
      };
    }

    await sql`DELETE FROM customers WHERE id = ${id}`;
    revalidatePath('/ui/customers');
    return { message: 'Deleted Customer.' };
  } catch (error) {
    console.error('Database Error:', error);
    return { message: 'Database Error: Failed to Delete Customer.' };
  }
}

export async function authenticate(prevState, formData) {
  try {
    await signIn('credentials', {
      redirect: true,
      redirectTo: '/ui/dashboard',
      email: formData.get('email'),
      password: formData.get('password'),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}
