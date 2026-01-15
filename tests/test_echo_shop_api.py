"""
ECHO SHOP API Tests - Backend Testing
Tests for Phase 1 (Vendas/Contratos/OS) and Phase 2 (Equipamentos) APIs
"""
import pytest
import requests
import os

# Use relative API URL since frontend uses /api
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001/api').rstrip('/')
if not BASE_URL.endswith('/api'):
    BASE_URL = BASE_URL + '/api'

# Test credentials
TEST_EMAIL = "faraujoneto2025@gmail.com"
TEST_PASSWORD = "Rebeca@19"


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "access_token" in data, "Missing access_token in response"
        assert "user" in data, "Missing user in response"
        assert data["user"]["email"] == TEST_EMAIL
        assert "id" in data["user"]
        assert "perfil" in data["user"]
        
        print(f"✅ Login successful - User: {data['user']['nome']}, Perfil: {data['user']['perfil']}")
        return data
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "invalid@test.com",
            "senha": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Invalid credentials correctly rejected")
    
    def test_auth_me_endpoint(self):
        """Test /auth/me endpoint with valid token"""
        # First login
        login_response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Test /auth/me
        response = requests.get(f"{BASE_URL}/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        data = response.json()
        assert data["email"] == TEST_EMAIL
        print(f"✅ Auth/me endpoint working - User ID: {data['id']}")


class TestEmpresasEndpoints:
    """Company endpoints tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        login_response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.user = login_response.json()["user"]
    
    def test_list_empresas(self):
        """Test listing companies"""
        response = requests.get(f"{BASE_URL}/empresas", headers=self.headers)
        
        assert response.status_code == 200, f"List empresas failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            empresa = data[0]
            assert "id" in empresa
            assert "razao_social" in empresa
            self.empresa_id = empresa["id"]
            print(f"✅ Found {len(data)} empresa(s) - First: {empresa['razao_social']}")
        else:
            print("⚠️ No empresas found")
        
        return data


class TestOrdensServicoEndpoints:
    """Service Orders (OS) endpoints tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token and empresa_id"""
        login_response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get empresa_id
        empresas_response = requests.get(f"{BASE_URL}/empresas", headers=self.headers)
        assert empresas_response.status_code == 200
        empresas = empresas_response.json()
        assert len(empresas) > 0, "No empresas found for testing"
        self.empresa_id = empresas[0]["id"]
    
    def test_list_ordens_servico(self):
        """Test GET /empresas/{id}/ordens-servico - List OS"""
        response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/ordens-servico",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"List OS failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            os = data[0]
            # Validate OS structure
            assert "id" in os
            assert "numero" in os
            assert "status" in os
            assert "tipo" in os
            assert "cliente_nome" in os
            print(f"✅ Found {len(data)} OS - First: {os['numero']} ({os['status']})")
            return data
        else:
            print("⚠️ No OS found")
            return []
    
    def test_list_ordens_servico_with_filters(self):
        """Test OS listing with status filter"""
        response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/ordens-servico?status=aberta",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"List OS with filter failed: {response.text}"
        data = response.json()
        
        # All returned OS should have status 'aberta'
        for os in data:
            assert os["status"] == "aberta", f"Filter not working: got status {os['status']}"
        
        print(f"✅ OS filter working - Found {len(data)} OS with status 'aberta'")
    
    def test_get_ordem_servico_details(self):
        """Test GET /ordens-servico/{id} - Get OS details"""
        # First get list of OS
        list_response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/ordens-servico",
            headers=self.headers
        )
        assert list_response.status_code == 200
        ordens = list_response.json()
        
        if len(ordens) == 0:
            pytest.skip("No OS available for testing")
        
        os_id = ordens[0]["id"]
        
        # Get details
        response = requests.get(
            f"{BASE_URL}/ordens-servico/{os_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Get OS details failed: {response.text}"
        data = response.json()
        
        # Validate detailed structure
        assert "id" in data
        assert "numero" in data
        assert "checklist" in data
        assert "cliente" in data
        assert isinstance(data["checklist"], list)
        
        print(f"✅ OS details retrieved - {data['numero']}, Checklist items: {len(data['checklist'])}")
    
    def test_update_os_status(self):
        """Test PATCH /ordens-servico/{id}/status - Update OS status"""
        # Get an OS with status 'aberta' or 'agendada'
        list_response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/ordens-servico",
            headers=self.headers
        )
        assert list_response.status_code == 200
        ordens = list_response.json()
        
        # Find an OS that can be updated
        test_os = None
        for os in ordens:
            if os["status"] in ["agendada"]:
                test_os = os
                break
        
        if not test_os:
            print("⚠️ No OS available for status update test (need 'agendada' status)")
            return
        
        # Try to update status to em_andamento
        response = requests.patch(
            f"{BASE_URL}/ordens-servico/{test_os['id']}/status",
            json={"status": "em_andamento"},
            headers=self.headers
        )
        
        # Status 200 or 400 (if checklist not complete) are both valid
        assert response.status_code in [200, 400], f"Update status failed: {response.text}"
        
        if response.status_code == 200:
            print(f"✅ OS status updated to 'em_andamento'")
        else:
            print(f"⚠️ Status update blocked (expected): {response.json().get('detail')}")
    
    def test_update_checklist(self):
        """Test PATCH /ordens-servico/{id}/checklist - Update checklist item"""
        # Get an OS
        list_response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/ordens-servico",
            headers=self.headers
        )
        assert list_response.status_code == 200
        ordens = list_response.json()
        
        if len(ordens) == 0:
            pytest.skip("No OS available for testing")
        
        os_id = ordens[0]["id"]
        
        # Update first checklist item
        response = requests.patch(
            f"{BASE_URL}/ordens-servico/{os_id}/checklist",
            json={"item_index": 0, "concluido": True},
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Update checklist failed: {response.text}"
        data = response.json()
        assert "checklist" in data
        print(f"✅ Checklist item updated successfully")


class TestEquipamentosTecnicosEndpoints:
    """Equipment management endpoints tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token and empresa_id"""
        login_response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get empresa_id
        empresas_response = requests.get(f"{BASE_URL}/empresas", headers=self.headers)
        assert empresas_response.status_code == 200
        empresas = empresas_response.json()
        assert len(empresas) > 0, "No empresas found for testing"
        self.empresa_id = empresas[0]["id"]
    
    def test_list_equipamentos_tecnicos(self):
        """Test GET /empresas/{id}/equipamentos-tecnicos - List equipment"""
        response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/equipamentos-tecnicos",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"List equipamentos failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            equip = data[0]
            assert "id" in equip
            assert "numero_serie" in equip
            assert "status" in equip
            assert "tipo" in equip
            print(f"✅ Found {len(data)} equipamentos - First: {equip['numero_serie']} ({equip['status']})")
        else:
            print("⚠️ No equipamentos found")
        
        return data
    
    def test_equipamentos_dashboard(self):
        """Test GET /empresas/{id}/equipamentos-tecnicos/dashboard - Dashboard"""
        response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/equipamentos-tecnicos/dashboard",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # Validate dashboard structure
        assert "total" in data
        assert "por_status" in data
        assert isinstance(data["por_status"], dict)
        
        print(f"✅ Dashboard retrieved - Total: {data['total']}, Status breakdown: {data['por_status']}")
    
    def test_list_tipos_equipamento(self):
        """Test GET /empresas/{id}/tipos-equipamento - List equipment types"""
        response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/tipos-equipamento",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"List tipos failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} tipos de equipamento")
    
    def test_list_depositos(self):
        """Test GET /empresas/{id}/depositos - List deposits/warehouses"""
        response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/depositos",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"List depositos failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} depósitos")


class TestContratosEndpoints:
    """Contract endpoints tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token and empresa_id"""
        login_response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get empresa_id
        empresas_response = requests.get(f"{BASE_URL}/empresas", headers=self.headers)
        assert empresas_response.status_code == 200
        empresas = empresas_response.json()
        assert len(empresas) > 0, "No empresas found for testing"
        self.empresa_id = empresas[0]["id"]
    
    def test_list_contratos(self):
        """Test GET /empresas/{id}/contratos - List contracts"""
        response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/contratos",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"List contratos failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            contrato = data[0]
            assert "id" in contrato
            assert "status" in contrato
            print(f"✅ Found {len(data)} contratos - First status: {contrato['status']}")
        else:
            print("⚠️ No contratos found")
        
        return data
    
    def test_assinar_contrato_not_found(self):
        """Test POST /contratos/{id}/assinar - Contract not found"""
        response = requests.post(
            f"{BASE_URL}/contratos/invalid-id-12345/assinar",
            json={
                "assinatura_base64": "data:image/png;base64,test",
                "assinado_por": "Test User",
                "ip_assinatura": "127.0.0.1"
            },
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Contract not found correctly handled")


class TestUsersEndpoints:
    """User management endpoints tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        login_response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_users(self):
        """Test GET /users - List users (admin only)"""
        response = requests.get(f"{BASE_URL}/users", headers=self.headers)
        
        assert response.status_code == 200, f"List users failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            user = data[0]
            assert "id" in user
            assert "nome" in user
            assert "email" in user
            assert "perfil" in user
            # Ensure password hash is not exposed
            assert "senha_hash" not in user
            print(f"✅ Found {len(data)} users")
        
        return data


class TestHealthEndpoints:
    """Health check endpoints tests"""
    
    def test_health_check(self):
        """Test /api/health endpoint"""
        response = requests.get(f"{BASE_URL}/health")
        
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ Health check passed")
    
    def test_root_endpoint(self):
        """Test /api/ root endpoint"""
        response = requests.get(f"{BASE_URL}/")
        
        assert response.status_code == 200, f"Root endpoint failed: {response.text}"
        print("✅ Root endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
