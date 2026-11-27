import { getPool, sql } from '../../config/db.js';

export type EmployeeRecord = { empleado_id: number; nombres: string; rol_rbac: string; email: string; password_hash: string };
export type CustomerRecord = { cliente_id: number; nombres: string; email: string; opt_in_marketing: boolean; password_hash: string | null };

export async function findEmployeeByEmail(email: string): Promise<EmployeeRecord | undefined> {
  const result = await (await getPool()).request().input('email', sql.NVarChar(120), email).query<EmployeeRecord>(
    'SELECT empleado_id, nombres, rol_rbac, email, password_hash FROM dbo.Empleado WHERE email = @email AND activo = 1'
  );
  return result.recordset[0];
}

export async function findCustomerByEmail(email: string): Promise<CustomerRecord | undefined> {
  const result = await (await getPool()).request().input('email', sql.NVarChar(120), email).query<CustomerRecord>(
    'SELECT cliente_id, nombres, email, opt_in_marketing, password_hash FROM dbo.RegistroCliente WHERE email = @email'
  );
  return result.recordset[0];
}

export async function createCustomer(input: { dni_ruc: string; nombres: string; telefono?: string; email: string; direccion?: string; opt_in_marketing: boolean; password_hash: string }): Promise<CustomerRecord> {
  const result = await (await getPool()).request()
    .input('dni_ruc', sql.NVarChar(11), input.dni_ruc)
    .input('nombres', sql.NVarChar(140), input.nombres)
    .input('telefono', sql.NVarChar(20), input.telefono ?? null)
    .input('email', sql.NVarChar(120), input.email)
    .input('direccion', sql.NVarChar(250), input.direccion ?? null)
    .input('opt_in_marketing', sql.Bit, input.opt_in_marketing)
    .input('password_hash', sql.NVarChar(255), input.password_hash)
    .query<CustomerRecord>(
      'INSERT INTO dbo.RegistroCliente (dni_ruc, nombres, telefono, email, direccion, opt_in_marketing, password_hash) OUTPUT INSERTED.cliente_id, INSERTED.nombres, INSERTED.email, INSERTED.opt_in_marketing, INSERTED.password_hash VALUES (@dni_ruc, @nombres, @telefono, @email, @direccion, @opt_in_marketing, @password_hash)'
    );
  return result.recordset[0];
}
