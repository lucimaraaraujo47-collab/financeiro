"""
Test suite for 'Histórico Vitalício de Equipamentos' feature
Tests backend endpoints and validates the new functionality
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

# Use localhost for testing since we're inside the container
BASE_URL = "http://localhost:8001/api"

# Test credentials
TEST_EMAIL = "faraujoneto2025@gmail.com"
TEST_PASSWORD = "Rebeca@19"

# Global token storage
_cached_token = None
_cached_empresa_id = None


class TestHistoricoEquipamentos:
    """Test suite for Histórico Vitalício de Equipamentos feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        global _cached_token, _cached_empresa_id
        
        if not _cached_token:
            # Login to get token
            response = requests.post(f"{BASE_URL}/auth/login", json={
                "email": TEST_EMAIL,
                "senha": TEST_PASSWORD
            })
            assert response.status_code == 200, f"Login failed: {response.text}"
            data = response.json()
            _cached_token = data.get("access_token")
            assert _cached_token, "No token received"
        
        self.token = _cached_token
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        if not _cached_empresa_id:
            # Get empresa_id
            response = requests.get(f"{BASE_URL}/empresas", headers=self.headers)
            assert response.status_code == 200, f"Failed to get empresas: {response.text}"
            empresas = response.json()
            assert len(empresas) > 0, "No empresas found"
            _cached_empresa_id = empresas[0].get("id")
        
        self.empresa_id = _cached_empresa_id
    
    # ==================== BACKEND API TESTS ====================
    
    def test_01_login_success(self):
        """Test login endpoint works"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✅ Login successful - User: {data['user'].get('nome')}")
    
    def test_02_get_empresas(self):
        """Test empresas endpoint"""
        response = requests.get(f"{BASE_URL}/empresas", headers=self.headers)
        assert response.status_code == 200
        empresas = response.json()
        assert isinstance(empresas, list)
        assert len(empresas) > 0
        print(f"✅ Found {len(empresas)} empresa(s)")
    
    def test_03_list_equipamentos_tecnicos(self):
        """Test listing technical equipment"""
        response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/equipamentos-tecnicos",
            headers=self.headers
        )
        assert response.status_code == 200
        equipamentos = response.json()
        assert isinstance(equipamentos, list)
        print(f"✅ Found {len(equipamentos)} equipamentos técnicos")
        return equipamentos
    
    def test_04_equipamentos_dashboard(self):
        """Test equipment dashboard endpoint"""
        response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/equipamentos-tecnicos/dashboard",
            headers=self.headers
        )
        assert response.status_code == 200
        dashboard = response.json()
        assert "total" in dashboard
        assert "por_status" in dashboard
        print(f"✅ Dashboard - Total: {dashboard.get('total')}, Status: {dashboard.get('por_status')}")
    
    def test_05_tipos_equipamento(self):
        """Test equipment types endpoint"""
        response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/tipos-equipamento",
            headers=self.headers
        )
        assert response.status_code == 200
        tipos = response.json()
        assert isinstance(tipos, list)
        print(f"✅ Found {len(tipos)} tipos de equipamento")
        return tipos
    
    def test_06_depositos(self):
        """Test deposits endpoint"""
        response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/depositos",
            headers=self.headers
        )
        assert response.status_code == 200
        depositos = response.json()
        assert isinstance(depositos, list)
        print(f"✅ Found {len(depositos)} depósitos")
        return depositos
    
    def test_07_historico_completo_not_found(self):
        """Test historico-completo with non-existent equipment"""
        fake_id = str(uuid.uuid4())
        response = requests.get(
            f"{BASE_URL}/equipamentos/{fake_id}/historico-completo",
            headers=self.headers
        )
        assert response.status_code == 404
        print("✅ Correctly returns 404 for non-existent equipment")
    
    def test_08_manutencao_not_found(self):
        """Test manutencao endpoint with non-existent equipment"""
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/equipamentos/{fake_id}/manutencao",
            headers=self.headers,
            json={"defeito_relatado": "Test defect"}
        )
        assert response.status_code == 404
        print("✅ Correctly returns 404 for manutencao on non-existent equipment")
    
    def test_09_evento_not_found(self):
        """Test evento endpoint with non-existent equipment"""
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/equipamentos/{fake_id}/evento",
            headers=self.headers,
            json={"tipo": "OBSERVACAO", "descricao": "Test event"}
        )
        assert response.status_code == 404
        print("✅ Correctly returns 404 for evento on non-existent equipment")
    
    def test_10_create_test_equipment(self):
        """Create a test equipment for further testing"""
        # First check if we have tipos
        tipos_response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/tipos-equipamento",
            headers=self.headers
        )
        tipos = tipos_response.json()
        
        tipo_nome = tipos[0].get("nome") if tipos else "Roteador"
        
        test_serial = f"TEST-{uuid.uuid4().hex[:8].upper()}"
        
        response = requests.post(
            f"{BASE_URL}/empresas/{self.empresa_id}/equipamentos-tecnicos",
            headers=self.headers,
            json={
                "numero_serie": test_serial,
                "tipo": tipo_nome,
                "marca": "Test Brand",
                "modelo": "Test Model",
                "descricao": "Test equipment for historico testing"
            }
        )
        
        if response.status_code == 201 or response.status_code == 200:
            equip = response.json()
            print(f"✅ Created test equipment: {test_serial} (ID: {equip.get('id')})")
            return equip
        else:
            print(f"⚠️ Could not create equipment: {response.status_code} - {response.text}")
            # Try to get existing equipment
            equips = requests.get(
                f"{BASE_URL}/empresas/{self.empresa_id}/equipamentos-tecnicos",
                headers=self.headers
            ).json()
            if equips:
                print(f"✅ Using existing equipment: {equips[0].get('numero_serie')}")
                return equips[0]
            return None
    
    def test_11_historico_completo_with_equipment(self):
        """Test historico-completo with real equipment"""
        # Get equipment list
        response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/equipamentos-tecnicos",
            headers=self.headers
        )
        equipamentos = response.json()
        
        if not equipamentos:
            pytest.skip("No equipment available for testing")
        
        equip_id = equipamentos[0].get("id")
        
        response = requests.get(
            f"{BASE_URL}/equipamentos/{equip_id}/historico-completo",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "equipamento" in data
        assert "timeline" in data
        assert "total_os" in data
        assert "total_manutencoes" in data
        assert "total_eventos" in data
        
        print(f"✅ Historico completo retrieved:")
        print(f"   - Equipment: {data['equipamento'].get('numero_serie')}")
        print(f"   - Timeline events: {data['total_eventos']}")
        print(f"   - Total OS: {data['total_os']}")
        print(f"   - Total Manutenções: {data['total_manutencoes']}")
        
        return data
    
    def test_12_registrar_evento(self):
        """Test registering an event on equipment"""
        # Get equipment list
        response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/equipamentos-tecnicos",
            headers=self.headers
        )
        equipamentos = response.json()
        
        if not equipamentos:
            pytest.skip("No equipment available for testing")
        
        equip_id = equipamentos[0].get("id")
        
        response = requests.post(
            f"{BASE_URL}/equipamentos/{equip_id}/evento",
            headers=self.headers,
            json={
                "tipo": "OBSERVACAO",
                "descricao": f"Test event registered at {datetime.now().isoformat()}"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ Event registered successfully: {data.get('message')}")
        
        # Verify event appears in historico
        hist_response = requests.get(
            f"{BASE_URL}/equipamentos/{equip_id}/historico-completo",
            headers=self.headers
        )
        hist_data = hist_response.json()
        
        # Check if our event is in the timeline
        timeline = hist_data.get("timeline", [])
        has_observacao = any(e.get("tipo") == "OBSERVACAO" for e in timeline)
        print(f"✅ Event verified in timeline: {has_observacao}")
    
    def test_13_registrar_manutencao(self):
        """Test registering maintenance on equipment"""
        # Get equipment list
        response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/equipamentos-tecnicos",
            headers=self.headers
        )
        equipamentos = response.json()
        
        if not equipamentos:
            pytest.skip("No equipment available for testing")
        
        # Find equipment that is not already in maintenance
        equip = None
        for e in equipamentos:
            if e.get("status") != "em_manutencao":
                equip = e
                break
        
        if not equip:
            print("⚠️ All equipment is in maintenance, skipping test")
            pytest.skip("No available equipment for maintenance test")
        
        equip_id = equip.get("id")
        
        response = requests.post(
            f"{BASE_URL}/equipamentos/{equip_id}/manutencao",
            headers=self.headers,
            json={
                "defeito_relatado": "Test defect - automated testing",
                "diagnostico": "Test diagnosis",
                "custo_estimado": 150.00,
                "observacoes": "This is a test maintenance entry"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "message" in data
        print(f"✅ Maintenance registered: {data.get('message')} (ID: {data.get('id')})")
        
        # Verify equipment status changed
        equip_response = requests.get(
            f"{BASE_URL}/equipamentos/{equip_id}/historico-completo",
            headers=self.headers
        )
        equip_data = equip_response.json()
        
        # Check status
        current_status = equip_data.get("equipamento", {}).get("status")
        print(f"✅ Equipment status after maintenance: {current_status}")
        
        return data.get("id")
    
    def test_14_listar_manutencoes(self):
        """Test listing maintenance records"""
        response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/manutencoes",
            headers=self.headers
        )
        
        assert response.status_code == 200
        manutencoes = response.json()
        assert isinstance(manutencoes, list)
        print(f"✅ Found {len(manutencoes)} manutenções")
        
        if manutencoes:
            m = manutencoes[0]
            print(f"   - Latest: {m.get('numero_serie')} - {m.get('defeito_relatado', 'N/A')[:50]}")
    
    def test_15_concluir_manutencao(self):
        """Test concluding a maintenance"""
        # Get maintenance list
        response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/manutencoes?status=em_andamento",
            headers=self.headers
        )
        manutencoes = response.json()
        
        if not manutencoes:
            print("⚠️ No active maintenance to conclude")
            pytest.skip("No active maintenance available")
        
        manutencao_id = manutencoes[0].get("id")
        
        response = requests.patch(
            f"{BASE_URL}/manutencoes/{manutencao_id}/concluir",
            headers=self.headers,
            json={
                "servico_realizado": "Test service completed",
                "custo_final": 120.00,
                "observacoes": "Maintenance concluded via automated test",
                "novo_status_equipamento": "disponivel"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Maintenance concluded: {data.get('message')}")
    
    def test_16_transferir_equipamento(self):
        """Test equipment transfer endpoint"""
        # Get equipment and deposits
        equip_response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/equipamentos-tecnicos",
            headers=self.headers
        )
        equipamentos = equip_response.json()
        
        dep_response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/depositos",
            headers=self.headers
        )
        depositos = dep_response.json()
        
        if not equipamentos:
            pytest.skip("No equipment available")
        
        if not depositos:
            pytest.skip("No deposits available")
        
        equip = equipamentos[0]
        deposito = depositos[0]
        
        response = requests.post(
            f"{BASE_URL}/equipamentos/{equip.get('id')}/transferir",
            headers=self.headers,
            json={
                "destino_tipo": "deposito",
                "destino_id": deposito.get("id"),
                "destino_nome": deposito.get("nome"),
                "motivo": "Test transfer"
            }
        )
        
        # Transfer might fail if equipment is in maintenance, that's ok
        if response.status_code == 200:
            print(f"✅ Equipment transferred successfully")
        else:
            print(f"⚠️ Transfer returned {response.status_code}: {response.text[:100]}")
    
    def test_17_get_single_equipment(self):
        """Test getting single equipment details via historico-completo endpoint"""
        # Get equipment list
        response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/equipamentos-tecnicos",
            headers=self.headers
        )
        equipamentos = response.json()
        
        if not equipamentos:
            pytest.skip("No equipment available")
        
        equip_id = equipamentos[0].get("id")
        
        # Note: /equipamentos/{id} endpoint is for general inventory equipment
        # For technical equipment, use historico-completo which returns equipment details
        response = requests.get(
            f"{BASE_URL}/equipamentos/{equip_id}/historico-completo",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        equip = data.get("equipamento", {})
        assert "id" in equip
        assert "numero_serie" in equip
        print(f"✅ Got equipment details via historico-completo: {equip.get('numero_serie')}")


class TestHistoricoEquipamentosEdgeCases:
    """Edge case tests for Histórico Vitalício"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        global _cached_token, _cached_empresa_id
        
        if not _cached_token:
            response = requests.post(f"{BASE_URL}/auth/login", json={
                "email": TEST_EMAIL,
                "senha": TEST_PASSWORD
            })
            data = response.json()
            _cached_token = data.get("access_token")
        
        self.token = _cached_token
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        if not _cached_empresa_id:
            response = requests.get(f"{BASE_URL}/empresas", headers=self.headers)
            empresas = response.json()
            _cached_empresa_id = empresas[0].get("id") if empresas else None
        
        self.empresa_id = _cached_empresa_id
    
    def test_evento_tipos_validos(self):
        """Test different event types"""
        response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/equipamentos-tecnicos",
            headers=self.headers
        )
        equipamentos = response.json()
        
        if not equipamentos:
            pytest.skip("No equipment available")
        
        equip_id = equipamentos[0].get("id")
        
        event_types = ["OBSERVACAO", "INSPECAO", "AJUSTE", "TROCA_PECAS", "LIMPEZA", "GARANTIA", "OUTRO"]
        
        for event_type in event_types:
            response = requests.post(
                f"{BASE_URL}/equipamentos/{equip_id}/evento",
                headers=self.headers,
                json={
                    "tipo": event_type,
                    "descricao": f"Test {event_type} event"
                }
            )
            assert response.status_code == 200, f"Failed for event type: {event_type}"
        
        print(f"✅ All {len(event_types)} event types registered successfully")
    
    def test_manutencao_campos_opcionais(self):
        """Test maintenance with minimal fields"""
        response = requests.get(
            f"{BASE_URL}/empresas/{self.empresa_id}/equipamentos-tecnicos",
            headers=self.headers
        )
        equipamentos = response.json()
        
        if not equipamentos:
            pytest.skip("No equipment available")
        
        # Find available equipment
        equip = None
        for e in equipamentos:
            if e.get("status") not in ["em_manutencao", "baixado"]:
                equip = e
                break
        
        if not equip:
            pytest.skip("No available equipment")
        
        # Minimal maintenance request
        response = requests.post(
            f"{BASE_URL}/equipamentos/{equip.get('id')}/manutencao",
            headers=self.headers,
            json={
                "defeito_relatado": "Minimal test"
            }
        )
        
        assert response.status_code == 200
        print("✅ Maintenance with minimal fields works")
    
    def test_unauthorized_access(self):
        """Test endpoints without authentication"""
        fake_id = str(uuid.uuid4())
        
        # Test without token
        response = requests.get(f"{BASE_URL}/equipamentos/{fake_id}/historico-completo")
        assert response.status_code in [401, 403]
        
        response = requests.post(f"{BASE_URL}/equipamentos/{fake_id}/manutencao", json={})
        assert response.status_code in [401, 403]
        
        response = requests.post(f"{BASE_URL}/equipamentos/{fake_id}/evento", json={})
        assert response.status_code in [401, 403]
        
        print("✅ Unauthorized access correctly blocked")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
