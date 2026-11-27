import bcrypt from 'bcryptjs';
import { AppError } from '../../shared/errors/AppError.js';
import { signToken, type AuthUser } from '../../shared/middlewares/auth.middleware.js';
import * as repository from './auth.repository.js';

const destinations: Record<string, string> = {
  TN01: '/admin.html', TN02: '/pos-vendedor.html', TN03: '/marketing.html', TN04: '/almacen.html', TN05: '/pos-cajero.html', AN01: '/index.html'
};
const roleCodes: Record<string, AuthUser['rolCodigo']> = {
  Administrador: 'TN01', Vendedor: 'TN02', 'Community Manager': 'TN03', Almacenero: 'TN04', Cajero: 'TN05', Cliente: 'AN01'
};

function response(user: AuthUser) {
  const session = signToken(user);
  return { ok: true, ...session, user };
}

export async function login(input: { email: string; password: string }) {
  const row = await repository.findEmployeeByEmail(input.email.toLowerCase());
  if (row && await bcrypt.compare(input.password, row.password_hash)) {
    const rolCodigo = roleCodes[row.rol_rbac];
    if (!rolCodigo) throw new AppError(403, 'RBAC_FORBIDDEN', 'El rol de esta cuenta no está habilitado.', 'RN-SEG-01');
    return response({ id: row.empleado_id, rolCodigo, rol_rbac: row.rol_rbac, displayName: row.nombres, email: row.email, destination: destinations[rolCodigo] });
  }
  const client = await repository.findCustomerByEmail(input.email.toLowerCase());
  if (client?.password_hash && await bcrypt.compare(input.password, client.password_hash)) {
    return response({ id: client.cliente_id, rolCodigo: 'AN01', rol_rbac: 'Cliente', displayName: client.nombres, email: client.email, destination: destinations.AN01, opt_in_marketing: client.opt_in_marketing });
  }
  throw new AppError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.', 'RN-SEG-01');
}

export async function register(input: { nombres: string; email: string; password: string; dni_ruc?: string; telefono?: string; direccion?: string; opt_in_marketing?: boolean }) {
  if (!input.dni_ruc) throw new AppError(400, 'MISSING_REQUIRED_FIELD', 'Ingresa tu DNI o RUC.', 'RN-ACC-03', 'dni_ruc');
  const passwordHash = await bcrypt.hash(input.password, 12);
  const client = await repository.createCustomer({ ...input, dni_ruc: input.dni_ruc, email: input.email.toLowerCase(), opt_in_marketing: input.opt_in_marketing ?? false, password_hash: passwordHash });
  return response({ id: client.cliente_id, rolCodigo: 'AN01', rol_rbac: 'Cliente', displayName: client.nombres, email: client.email, destination: destinations.AN01, opt_in_marketing: client.opt_in_marketing });
}

