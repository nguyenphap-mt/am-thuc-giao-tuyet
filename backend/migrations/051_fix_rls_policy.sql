DROP POLICY IF EXISTS tenant_isolation ON users;

CREATE POLICY tenant_isolation ON users
    USING (
        tenant_id = current_setting('app.current_tenant')::uuid
        OR 
        current_setting('app.bypass_rls', true) = 'on'
    );
