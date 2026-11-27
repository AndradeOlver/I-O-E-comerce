IF COL_LENGTH('dbo.RegistroCliente', 'password_hash') IS NULL
BEGIN
    ALTER TABLE dbo.RegistroCliente
    ADD password_hash NVARCHAR(255) NULL;
END;
GO
