#!/usr/bin/env python3
"""
Backend API Testing for ECHO SHOP FinAI - Complete Inventory Management System CRUD Operations
Tests complete CRUD operations for all inventory modules: Clientes, Fornecedores, Locais, 
Categorias Equipamentos, Equipamentos, Equipamentos Serializados, and Movimentações de Estoque
"""

import requests
import json
import os
from datetime import datetime
import uuid

# Configuration
BACKEND_URL = "https://fintracker-117.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@echoshop.com.br"  # Updated to match test credentials
ADMIN_PASSWORD = "Admin@2024"  # Updated to match test credentials
EMPRESA_ID = "226b58c1-4a48-4b66-9537-0dbf9fa65500"

class FinAITestRunner:
    def __init__(self):
        self.token = None
        self.user_data = None
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
        # Test data storage - Financial
        self.created_investment_id = None
        self.created_card_id = None
        self.created_account_id = None
        
        # Test data storage - Inventory
        self.created_cliente_id = None
        self.created_fornecedor_id = None
        self.created_local_id = None
        self.created_categoria_roteadores_id = None
        self.created_categoria_cabos_id = None
        self.created_equipamento_router_id = None
        self.created_equipamento_cabo_id = None
        self.created_eq_serial_1_id = None
        self.created_eq_serial_2_id = None
        self.test_categoria_id = None
        self.test_centro_custo_id = None
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def test_admin_login(self):
        """Test 1: Login as Admin"""
        self.log("Testing admin login...")
        
        login_data = {
            "email": ADMIN_EMAIL,
            "senha": ADMIN_PASSWORD
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.user_data = data.get("user", {})
                
                if self.token:
                    self.session.headers.update({
                        'Authorization': f'Bearer {self.token}'
                    })
                    self.log("✅ Admin login successful")
                    self.log(f"   User ID: {self.user_data.get('id')}")
                    self.log(f"   User Profile: {self.user_data.get('perfil')}")
                    self.log(f"   Empresa IDs: {self.user_data.get('empresa_ids')}")
                    
                    # Verify expected empresa_id is in user's list
                    if EMPRESA_ID in self.user_data.get('empresa_ids', []):
                        self.log(f"   ✅ Expected empresa_id {EMPRESA_ID} found in user's empresas")
                    else:
                        self.log(f"   ❌ Expected empresa_id {EMPRESA_ID} NOT found in user's empresas", "ERROR")
                        return False
                    
                    return True
                else:
                    self.log("❌ Login response missing access token", "ERROR")
                    return False
            else:
                self.log(f"❌ Login failed with status {response.status_code}: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Login request failed: {str(e)}", "ERROR")
            return False
    
    def test_clientes_crud(self):
        """Test 2: Clientes CRUD Operations"""
        self.log("Testing Clientes CRUD operations...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        # Test CREATE Cliente
        self.log("  2.1 Testing CREATE cliente...")
        cliente_data = {
            "nome": "Tech Solutions LTDA",
            "tipo": "juridica",
            "cnpj_cpf": "12345678000190",
            "email": "contato@techsolutions.com",
            "telefone": "11987654321",
            "cidade": "São Paulo",
            "estado": "SP"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/clientes", json=cliente_data)
            
            if response.status_code == 200:
                created_cliente = response.json()
                self.created_cliente_id = created_cliente.get('id')
                self.log("    ✅ Cliente created successfully")
                self.log(f"       ID: {self.created_cliente_id}")
                self.log(f"       Nome: {created_cliente.get('nome')}")
                self.log(f"       Tipo: {created_cliente.get('tipo')}")
                self.log(f"       CNPJ/CPF: {created_cliente.get('cnpj_cpf')}")
                self.log(f"       Email: {created_cliente.get('email')}")
            else:
                self.log(f"    ❌ Failed to create cliente: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error creating cliente: {str(e)}", "ERROR")
            return False
        
        # Test LIST Clientes
        self.log("  2.2 Testing LIST clientes...")
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/clientes")
            
            if response.status_code == 200:
                clientes = response.json()
                self.log(f"    ✅ Retrieved {len(clientes)} clientes")
                
                # Verify created cliente appears in list
                found_cliente = None
                for cliente in clientes:
                    if cliente.get('id') == self.created_cliente_id:
                        found_cliente = cliente
                        break
                
                if found_cliente:
                    self.log("    ✅ Created cliente found in list")
                else:
                    self.log("    ❌ Created cliente NOT found in list", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to list clientes: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error listing clientes: {str(e)}", "ERROR")
            return False
        
        # Test UPDATE Cliente
        self.log("  2.3 Testing UPDATE cliente...")
        update_data = {
            "nome": "Tech Solutions LTDA",
            "tipo": "juridica",
            "cnpj_cpf": "12345678000190",
            "email": "contato@techsolutions.com",
            "telefone": "11999888777",  # Updated phone
            "cidade": "São Paulo",
            "estado": "SP"
        }
        
        try:
            response = self.session.put(f"{BACKEND_URL}/clientes/{self.created_cliente_id}", json=update_data)
            
            if response.status_code == 200:
                updated_cliente = response.json()
                self.log("    ✅ Cliente updated successfully")
                self.log(f"       New Telefone: {updated_cliente.get('telefone')}")
                
                if updated_cliente.get('telefone') == "11999888777":
                    self.log("    ✅ Telefone updated correctly")
                else:
                    self.log(f"    ❌ Telefone not updated correctly", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to update cliente: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error updating cliente: {str(e)}", "ERROR")
            return False
        
        # Test DELETE Cliente (will be done at the end)
        self.log("  2.4 Cliente DELETE test will be performed at cleanup")
        return True
    
    def test_fornecedores_crud(self):
        """Test 3: Fornecedores CRUD Operations"""
        self.log("Testing Fornecedores CRUD operations...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        # Test CREATE Fornecedor
        self.log("  3.1 Testing CREATE fornecedor...")
        fornecedor_data = {
            "nome": "Fornecedor ABC",
            "cnpj": "98765432000100",
            "contato": "João Silva",
            "email": "joao@abc.com",
            "telefone": "11999887766"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/fornecedores", json=fornecedor_data)
            
            if response.status_code == 200:
                created_fornecedor = response.json()
                self.created_fornecedor_id = created_fornecedor.get('id')
                self.log("    ✅ Fornecedor created successfully")
                self.log(f"       ID: {self.created_fornecedor_id}")
                self.log(f"       Nome: {created_fornecedor.get('nome')}")
                self.log(f"       CNPJ: {created_fornecedor.get('cnpj')}")
                self.log(f"       Contato: {created_fornecedor.get('contato')}")
            else:
                self.log(f"    ❌ Failed to create fornecedor: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error creating fornecedor: {str(e)}", "ERROR")
            return False
        
        # Test LIST Fornecedores
        self.log("  3.2 Testing LIST fornecedores...")
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/fornecedores")
            
            if response.status_code == 200:
                fornecedores = response.json()
                self.log(f"    ✅ Retrieved {len(fornecedores)} fornecedores")
                
                found_fornecedor = any(f.get('id') == self.created_fornecedor_id for f in fornecedores)
                if found_fornecedor:
                    self.log("    ✅ Created fornecedor found in list")
                else:
                    self.log("    ❌ Created fornecedor NOT found in list", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to list fornecedores: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error listing fornecedores: {str(e)}", "ERROR")
            return False
        
        # Test UPDATE Fornecedor
        self.log("  3.3 Testing UPDATE fornecedor...")
        update_data = {
            "nome": "Fornecedor ABC Atualizado",
            "cnpj": "98765432000100",
            "contato": "João Silva",
            "email": "joao@abc.com",
            "telefone": "11999887766"
        }
        
        try:
            response = self.session.put(f"{BACKEND_URL}/fornecedores/{self.created_fornecedor_id}", json=update_data)
            
            if response.status_code == 200:
                updated_fornecedor = response.json()
                self.log("    ✅ Fornecedor updated successfully")
                self.log(f"       New Nome: {updated_fornecedor.get('nome')}")
            else:
                self.log(f"    ❌ Failed to update fornecedor: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error updating fornecedor: {str(e)}", "ERROR")
            return False
        
        return True
    
    def test_locais_crud(self):
        """Test 4: Locais/Depósitos CRUD Operations"""
        self.log("Testing Locais/Depósitos CRUD operations...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        # Test CREATE Local
        self.log("  4.1 Testing CREATE local...")
        local_data = {
            "nome": "Depósito Principal",
            "descricao": "Depósito central",
            "responsavel": "Carlos",
            "endereco": "Rua ABC, 123"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/locais", json=local_data)
            
            if response.status_code == 200:
                created_local = response.json()
                self.created_local_id = created_local.get('id')
                self.log("    ✅ Local created successfully")
                self.log(f"       ID: {self.created_local_id}")
                self.log(f"       Nome: {created_local.get('nome')}")
                self.log(f"       Responsável: {created_local.get('responsavel')}")
            else:
                self.log(f"    ❌ Failed to create local: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error creating local: {str(e)}", "ERROR")
            return False
        
        # Test LIST Locais
        self.log("  4.2 Testing LIST locais...")
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/locais")
            
            if response.status_code == 200:
                locais = response.json()
                self.log(f"    ✅ Retrieved {len(locais)} locais")
                
                found_local = any(l.get('id') == self.created_local_id for l in locais)
                if found_local:
                    self.log("    ✅ Created local found in list")
                else:
                    self.log("    ❌ Created local NOT found in list", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to list locais: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error listing locais: {str(e)}", "ERROR")
            return False
        
        # Test UPDATE Local
        self.log("  4.3 Testing UPDATE local...")
        update_data = {
            "nome": "Depósito Principal Atualizado",
            "descricao": "Depósito central",
            "responsavel": "Carlos",
            "endereco": "Rua ABC, 123"
        }
        
        try:
            response = self.session.put(f"{BACKEND_URL}/locais/{self.created_local_id}", json=update_data)
            
            if response.status_code == 200:
                updated_local = response.json()
                self.log("    ✅ Local updated successfully")
                self.log(f"       New Nome: {updated_local.get('nome')}")
            else:
                self.log(f"    ❌ Failed to update local: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error updating local: {str(e)}", "ERROR")
            return False
        
        return True
    
    def test_categorias_equipamentos_crud(self):
        """Test 5: Categorias Equipamentos CRUD Operations"""
        self.log("Testing Categorias Equipamentos CRUD operations...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        # Test CREATE Categoria 1 (Roteadores)
        self.log("  5.1 Testing CREATE categoria equipamento (Roteadores)...")
        categoria_data = {
            "nome": "Roteadores",
            "descricao": "Equipamentos de rede",
            "tipo_controle": "serializado"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/categorias-equipamentos", json=categoria_data)
            
            if response.status_code == 200:
                created_categoria = response.json()
                self.created_categoria_roteadores_id = created_categoria.get('id')
                self.log("    ✅ Categoria Roteadores created successfully")
                self.log(f"       ID: {self.created_categoria_roteadores_id}")
                self.log(f"       Nome: {created_categoria.get('nome')}")
                self.log(f"       Tipo Controle: {created_categoria.get('tipo_controle')}")
            else:
                self.log(f"    ❌ Failed to create categoria: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error creating categoria: {str(e)}", "ERROR")
            return False
        
        # Test CREATE Categoria 2 (Cabos)
        self.log("  5.2 Testing CREATE categoria equipamento (Cabos)...")
        categoria_data = {
            "nome": "Cabos",
            "descricao": "Cabos de rede",
            "tipo_controle": "nao_serializado"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/categorias-equipamentos", json=categoria_data)
            
            if response.status_code == 200:
                created_categoria = response.json()
                self.created_categoria_cabos_id = created_categoria.get('id')
                self.log("    ✅ Categoria Cabos created successfully")
                self.log(f"       ID: {self.created_categoria_cabos_id}")
                self.log(f"       Nome: {created_categoria.get('nome')}")
                self.log(f"       Tipo Controle: {created_categoria.get('tipo_controle')}")
            else:
                self.log(f"    ❌ Failed to create categoria: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error creating categoria: {str(e)}", "ERROR")
            return False
        
        # Test LIST Categorias
        self.log("  5.3 Testing LIST categorias equipamentos...")
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/categorias-equipamentos")
            
            if response.status_code == 200:
                categorias = response.json()
                self.log(f"    ✅ Retrieved {len(categorias)} categorias")
                
                found_roteadores = any(c.get('id') == self.created_categoria_roteadores_id for c in categorias)
                found_cabos = any(c.get('id') == self.created_categoria_cabos_id for c in categorias)
                
                if found_roteadores and found_cabos:
                    self.log("    ✅ Both created categorias found in list")
                else:
                    self.log("    ❌ Created categorias NOT found in list", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to list categorias: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error listing categorias: {str(e)}", "ERROR")
            return False
        
        # Test UPDATE Categoria
        self.log("  5.4 Testing UPDATE categoria equipamento...")
        update_data = {
            "nome": "Roteadores Atualizados",
            "descricao": "Equipamentos de rede atualizados",
            "tipo_controle": "serializado"
        }
        
        try:
            response = self.session.put(f"{BACKEND_URL}/categorias-equipamentos/{self.created_categoria_roteadores_id}", json=update_data)
            
            if response.status_code == 200:
                updated_categoria = response.json()
                self.log("    ✅ Categoria updated successfully")
                self.log(f"       New Nome: {updated_categoria.get('nome')}")
            else:
                self.log(f"    ❌ Failed to update categoria: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error updating categoria: {str(e)}", "ERROR")
            return False
        
        return True
    
    def test_equipamentos_crud(self):
        """Test 6: Equipamentos CRUD Operations"""
        self.log("Testing Equipamentos CRUD operations...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        # Test CREATE Equipamento Serializado (Router)
        self.log("  6.1 Testing CREATE equipamento serializado (Router)...")
        equipamento_data = {
            "nome": "Roteador TP-Link AX3000",
            "categoria_id": self.created_categoria_roteadores_id,
            "fabricante": "TP-Link",
            "modelo": "AX3000",
            "custo_aquisicao": 500.0,
            "valor_venda": 800.0,
            "valor_locacao_mensal": 100.0,
            "tipo_controle": "serializado",
            "fornecedor_id": self.created_fornecedor_id,
            "estoque_minimo": 5
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/equipamentos", json=equipamento_data)
            
            if response.status_code == 200:
                created_equipamento = response.json()
                self.created_equipamento_router_id = created_equipamento.get('id')
                self.log("    ✅ Equipamento Router created successfully")
                self.log(f"       ID: {self.created_equipamento_router_id}")
                self.log(f"       Nome: {created_equipamento.get('nome')}")
                self.log(f"       Fabricante: {created_equipamento.get('fabricante')}")
                self.log(f"       Valor Venda: R$ {created_equipamento.get('valor_venda')}")
                self.log(f"       Tipo Controle: {created_equipamento.get('tipo_controle')}")
            else:
                self.log(f"    ❌ Failed to create equipamento: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error creating equipamento: {str(e)}", "ERROR")
            return False
        
        # Test CREATE Equipamento Não-Serializado (Cabo)
        self.log("  6.2 Testing CREATE equipamento não-serializado (Cabo)...")
        equipamento_data = {
            "nome": "Cabo Ethernet Cat6",
            "categoria_id": self.created_categoria_cabos_id,
            "fabricante": "Intelbras",
            "custo_aquisicao": 10.0,
            "valor_venda": 20.0,
            "tipo_controle": "nao_serializado",
            "estoque_minimo": 50
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/equipamentos", json=equipamento_data)
            
            if response.status_code == 200:
                created_equipamento = response.json()
                self.created_equipamento_cabo_id = created_equipamento.get('id')
                self.log("    ✅ Equipamento Cabo created successfully")
                self.log(f"       ID: {self.created_equipamento_cabo_id}")
                self.log(f"       Nome: {created_equipamento.get('nome')}")
                self.log(f"       Quantidade Estoque: {created_equipamento.get('quantidade_estoque')}")
            else:
                self.log(f"    ❌ Failed to create equipamento: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error creating equipamento: {str(e)}", "ERROR")
            return False
        
        # Test LIST Equipamentos
        self.log("  6.3 Testing LIST equipamentos...")
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/equipamentos")
            
            if response.status_code == 200:
                equipamentos = response.json()
                self.log(f"    ✅ Retrieved {len(equipamentos)} equipamentos")
                
                found_router = any(e.get('id') == self.created_equipamento_router_id for e in equipamentos)
                found_cabo = any(e.get('id') == self.created_equipamento_cabo_id for e in equipamentos)
                
                if found_router and found_cabo:
                    self.log("    ✅ Both created equipamentos found in list")
                else:
                    self.log("    ❌ Created equipamentos NOT found in list", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to list equipamentos: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error listing equipamentos: {str(e)}", "ERROR")
            return False
        
        # Test GET specific equipamento
        self.log("  6.4 Testing GET specific equipamento...")
        try:
            response = self.session.get(f"{BACKEND_URL}/equipamentos/{self.created_equipamento_router_id}")
            
            if response.status_code == 200:
                equipamento = response.json()
                self.log("    ✅ Retrieved specific equipamento successfully")
                self.log(f"       Nome: {equipamento.get('nome')}")
                self.log(f"       Valor Venda: R$ {equipamento.get('valor_venda')}")
            else:
                self.log(f"    ❌ Failed to get specific equipamento: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error getting specific equipamento: {str(e)}", "ERROR")
            return False
        
        # Test UPDATE Equipamento
        self.log("  6.5 Testing UPDATE equipamento...")
        
        # First get current equipamento to preserve quantidade_estoque
        try:
            response = self.session.get(f"{BACKEND_URL}/equipamentos/{self.created_equipamento_router_id}")
            if response.status_code == 200:
                current_equipamento = response.json()
                current_estoque = current_equipamento.get('quantidade_estoque', 0)
                self.log(f"       Current quantidade_estoque: {current_estoque}")
            else:
                self.log(f"    ❌ Failed to get current equipamento: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"    ❌ Error getting current equipamento: {str(e)}", "ERROR")
            return False
        
        update_data = {
            "nome": "Roteador TP-Link AX3000",
            "categoria_id": self.created_categoria_roteadores_id,
            "fabricante": "TP-Link",
            "modelo": "AX3000",
            "custo_aquisicao": 500.0,
            "valor_venda": 900.0,  # Updated price
            "valor_locacao_mensal": 100.0,
            "tipo_controle": "serializado",
            "fornecedor_id": self.created_fornecedor_id,
            "estoque_minimo": 5
        }
        
        try:
            response = self.session.put(f"{BACKEND_URL}/equipamentos/{self.created_equipamento_router_id}", json=update_data)
            
            if response.status_code == 200:
                updated_equipamento = response.json()
                self.log("    ✅ Equipamento updated successfully")
                self.log(f"       New Valor Venda: R$ {updated_equipamento.get('valor_venda')}")
                
                # Verify quantidade_estoque is preserved
                new_estoque = updated_equipamento.get('quantidade_estoque', 0)
                if new_estoque == current_estoque:
                    self.log(f"    ✅ Quantidade estoque preserved: {new_estoque}")
                else:
                    self.log(f"    ❌ Quantidade estoque not preserved: expected {current_estoque}, got {new_estoque}", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to update equipamento: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error updating equipamento: {str(e)}", "ERROR")
            return False
        
        return True
    
    def test_equipamentos_serializados_crud(self):
        """Test 7: Equipamentos Serializados CRUD Operations"""
        self.log("Testing Equipamentos Serializados CRUD operations...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        # Test CREATE Equipamento Serializado 1
        self.log("  7.1 Testing CREATE equipamento serializado 1...")
        eq_serial_data = {
            "equipamento_id": self.created_equipamento_router_id,
            "numero_serie": "SN123456789",
            "numero_linha": "11987654321",
            "numero_simcard": "89551234567890",
            "data_aquisicao": "2024-01-15",
            "data_garantia": "2025-01-15"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/equipamentos-serializados", json=eq_serial_data)
            
            if response.status_code == 200:
                created_eq_serial = response.json()
                self.created_eq_serial_1_id = created_eq_serial.get('id')
                self.log("    ✅ Equipamento Serializado 1 created successfully")
                self.log(f"       ID: {self.created_eq_serial_1_id}")
                self.log(f"       Número Série: {created_eq_serial.get('numero_serie')}")
                self.log(f"       Status: {created_eq_serial.get('status')}")
                self.log(f"       Número Linha: {created_eq_serial.get('numero_linha')}")
                self.log(f"       SIM Card: {created_eq_serial.get('numero_simcard')}")
            else:
                self.log(f"    ❌ Failed to create equipamento serializado: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error creating equipamento serializado: {str(e)}", "ERROR")
            return False
        
        # Test CREATE Equipamento Serializado 2
        self.log("  7.2 Testing CREATE equipamento serializado 2...")
        eq_serial_data = {
            "equipamento_id": self.created_equipamento_router_id,
            "numero_serie": "SN987654321",
            "numero_linha": "11999999999",
            "numero_simcard": "89559999999999"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/equipamentos-serializados", json=eq_serial_data)
            
            if response.status_code == 200:
                created_eq_serial = response.json()
                self.created_eq_serial_2_id = created_eq_serial.get('id')
                self.log("    ✅ Equipamento Serializado 2 created successfully")
                self.log(f"       ID: {self.created_eq_serial_2_id}")
                self.log(f"       Número Série: {created_eq_serial.get('numero_serie')}")
            else:
                self.log(f"    ❌ Failed to create equipamento serializado 2: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error creating equipamento serializado 2: {str(e)}", "ERROR")
            return False
        
        # Test unique numero_serie validation
        self.log("  7.3 Testing unique numero_serie validation...")
        duplicate_data = {
            "equipamento_id": self.created_equipamento_router_id,
            "numero_serie": "SN123456789"  # Duplicate
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/equipamentos-serializados", json=duplicate_data)
            
            if response.status_code == 400:
                self.log("    ✅ Duplicate numero_serie correctly rejected")
            else:
                self.log(f"    ❌ Duplicate numero_serie should have been rejected: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error testing duplicate numero_serie: {str(e)}", "ERROR")
            return False
        
        # Test LIST Equipamentos Serializados
        self.log("  7.4 Testing LIST equipamentos serializados...")
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/equipamentos-serializados")
            
            if response.status_code == 200:
                eq_serializados = response.json()
                self.log(f"    ✅ Retrieved {len(eq_serializados)} equipamentos serializados")
                
                found_1 = any(e.get('id') == self.created_eq_serial_1_id for e in eq_serializados)
                found_2 = any(e.get('id') == self.created_eq_serial_2_id for e in eq_serializados)
                
                if found_1 and found_2:
                    self.log("    ✅ Both created equipamentos serializados found in list")
                else:
                    self.log("    ❌ Created equipamentos serializados NOT found in list", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to list equipamentos serializados: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error listing equipamentos serializados: {str(e)}", "ERROR")
            return False
        
        # Test FILTER by status
        self.log("  7.5 Testing FILTER by status='disponivel'...")
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/equipamentos-serializados?status=disponivel")
            
            if response.status_code == 200:
                eq_disponiveis = response.json()
                self.log(f"    ✅ Retrieved {len(eq_disponiveis)} equipamentos disponíveis")
                
                # All should be disponivel initially
                all_disponivel = all(e.get('status') == 'disponivel' for e in eq_disponiveis)
                if all_disponivel:
                    self.log("    ✅ All filtered equipamentos have status 'disponivel'")
                else:
                    self.log("    ❌ Some filtered equipamentos don't have status 'disponivel'", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to filter equipamentos serializados: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error filtering equipamentos serializados: {str(e)}", "ERROR")
            return False
        
        # Test GET specific equipamento serializado
        self.log("  7.6 Testing GET specific equipamento serializado...")
        try:
            response = self.session.get(f"{BACKEND_URL}/equipamentos-serializados/{self.created_eq_serial_1_id}")
            
            if response.status_code == 200:
                eq_serial = response.json()
                self.log("    ✅ Retrieved specific equipamento serializado successfully")
                self.log(f"       Número Série: {eq_serial.get('numero_serie')}")
                self.log(f"       Status: {eq_serial.get('status')}")
            else:
                self.log(f"    ❌ Failed to get specific equipamento serializado: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error getting specific equipamento serializado: {str(e)}", "ERROR")
            return False
        
        # Test UPDATE SIM card (should go to history)
        self.log("  7.7 Testing UPDATE SIM card number (history tracking)...")
        update_data = {
            "numero_simcard": "89551111111111"  # New SIM card
        }
        
        try:
            response = self.session.put(f"{BACKEND_URL}/equipamentos-serializados/{self.created_eq_serial_1_id}", json=update_data)
            
            if response.status_code == 200:
                updated_eq_serial = response.json()
                self.log("    ✅ SIM card number updated successfully")
                self.log(f"       New SIM Card: {updated_eq_serial.get('numero_simcard')}")
                
                # Verify historico_simcards has the old number
                historico = updated_eq_serial.get('historico_simcards', [])
                if historico:
                    old_sim = historico[-1].get('numero')
                    if old_sim == "89551234567890":
                        self.log(f"    ✅ Old SIM card added to history: {old_sim}")
                    else:
                        self.log(f"    ❌ Old SIM card not in history correctly: {old_sim}", "ERROR")
                        return False
                else:
                    self.log("    ❌ No SIM card history found", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to update SIM card: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error updating SIM card: {str(e)}", "ERROR")
            return False
        
        return True
    
    def test_movimentacoes_estoque_complex(self):
        """Test 8: Movimentações de Estoque - Complex Business Logic"""
        self.log("Testing Movimentações de Estoque - Complex Business Logic...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        # Setup categories and cost centers for financial integration
        self.log("  8.1 Setting up financial categories and cost centers...")
        
        # Get or create category
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/categorias")
            if response.status_code == 200:
                categories = response.json()
                if categories:
                    self.test_categoria_id = categories[0]['id']
                    self.log(f"    ✅ Using existing category: {categories[0]['nome']}")
                else:
                    cat_data = {"nome": "Vendas Equipamentos", "tipo": "receita"}
                    response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/categorias", json=cat_data)
                    if response.status_code == 200:
                        self.test_categoria_id = response.json()['id']
                        self.log("    ✅ Created test category")
                    else:
                        self.log(f"    ❌ Failed to create category: {response.status_code}", "ERROR")
                        return False
        except Exception as e:
            self.log(f"    ❌ Error with categories: {str(e)}", "ERROR")
            return False
        
        # Get or create cost center
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/centros-custo")
            if response.status_code == 200:
                cost_centers = response.json()
                if cost_centers:
                    self.test_centro_custo_id = cost_centers[0]['id']
                    self.log(f"    ✅ Using existing cost center: {cost_centers[0]['nome']}")
                else:
                    cc_data = {"nome": "Operações", "area": "Comercial"}
                    response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/centros-custo", json=cc_data)
                    if response.status_code == 200:
                        self.test_centro_custo_id = response.json()['id']
                        self.log("    ✅ Created test cost center")
                    else:
                        self.log(f"    ❌ Failed to create cost center: {response.status_code}", "ERROR")
                        return False
        except Exception as e:
            self.log(f"    ❌ Error with cost centers: {str(e)}", "ERROR")
            return False
        
        # Test 8a: Serialized Equipment Movements
        self.log("  8.2 Testing serialized equipment movements...")
        
        # Create movement: saida_locacao
        self.log("    8.2.1 Testing saida_locacao movement...")
        mov_data = {
            "tipo": "saida_locacao",
            "data": "2024-01-20",
            "equipamento_id": self.created_equipamento_router_id,
            "equipamento_serializado_id": self.created_eq_serial_1_id,
            "cliente_id": self.created_cliente_id,
            "valor_financeiro": 100.0,
            "criar_transacao_financeira": True,
            "categoria_financeira_id": self.test_categoria_id,
            "centro_custo_id": self.test_centro_custo_id
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/movimentacoes", json=mov_data)
            
            if response.status_code == 200:
                created_mov = response.json()
                self.log("    ✅ Saida_locacao movement created successfully")
                
                # Verify equipamento_serializado status changed
                response = self.session.get(f"{BACKEND_URL}/equipamentos-serializados/{self.created_eq_serial_1_id}")
                if response.status_code == 200:
                    eq_serial = response.json()
                    status = eq_serial.get('status')
                    cliente_id = eq_serial.get('cliente_id')
                    tipo_vinculo = eq_serial.get('tipo_vinculo')
                    
                    if status == "em_cliente":
                        self.log(f"    ✅ Status changed to 'em_cliente'")
                    else:
                        self.log(f"    ❌ Status not changed correctly: {status}", "ERROR")
                        return False
                    
                    if cliente_id == self.created_cliente_id:
                        self.log(f"    ✅ Cliente_id set correctly")
                    else:
                        self.log(f"    ❌ Cliente_id not set correctly: {cliente_id}", "ERROR")
                        return False
                    
                    if tipo_vinculo == "locacao":
                        self.log(f"    ✅ Tipo_vinculo set to 'locacao'")
                    else:
                        self.log(f"    ❌ Tipo_vinculo not set correctly: {tipo_vinculo}", "ERROR")
                        return False
                
                # Verify financial transaction was created
                transacao_id = created_mov.get('transacao_id')
                if transacao_id:
                    self.log(f"    ✅ Financial transaction created: {transacao_id}")
                else:
                    self.log("    ❌ Financial transaction not created", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to create saida_locacao movement: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error creating saida_locacao movement: {str(e)}", "ERROR")
            return False
        
        # Create movement: devolucao
        self.log("    8.2.2 Testing devolucao movement...")
        mov_data = {
            "tipo": "devolucao",
            "data": "2024-01-25",
            "equipamento_id": self.created_equipamento_router_id,
            "equipamento_serializado_id": self.created_eq_serial_1_id
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/movimentacoes", json=mov_data)
            
            if response.status_code == 200:
                self.log("    ✅ Devolucao movement created successfully")
                
                # Verify status changed back to disponivel
                response = self.session.get(f"{BACKEND_URL}/equipamentos-serializados/{self.created_eq_serial_1_id}")
                if response.status_code == 200:
                    eq_serial = response.json()
                    status = eq_serial.get('status')
                    cliente_id = eq_serial.get('cliente_id')
                    
                    if status == "disponivel":
                        self.log(f"    ✅ Status changed back to 'disponivel'")
                    else:
                        self.log(f"    ❌ Status not changed correctly: {status}", "ERROR")
                        return False
                    
                    if cliente_id is None:
                        self.log(f"    ✅ Cliente_id cleared correctly")
                    else:
                        self.log(f"    ❌ Cliente_id not cleared: {cliente_id}", "ERROR")
                        return False
            else:
                self.log(f"    ❌ Failed to create devolucao movement: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error creating devolucao movement: {str(e)}", "ERROR")
            return False
        
        # Test other status changes
        status_tests = [
            ("saida_venda", "vendido"),
            ("manutencao", "em_manutencao"),
            ("perda", "baixado")
        ]
        
        for i, (movimento_tipo, expected_status) in enumerate(status_tests, 3):
            self.log(f"    8.2.{i} Testing {movimento_tipo} movement...")
            mov_data = {
                "tipo": movimento_tipo,
                "data": "2024-01-26",
                "equipamento_id": self.created_equipamento_router_id,
                "equipamento_serializado_id": self.created_eq_serial_1_id
            }
            
            if movimento_tipo == "saida_venda":
                mov_data["cliente_id"] = self.created_cliente_id
            
            try:
                response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/movimentacoes", json=mov_data)
                
                if response.status_code == 200:
                    self.log(f"    ✅ {movimento_tipo} movement created successfully")
                    
                    # Verify status changed
                    response = self.session.get(f"{BACKEND_URL}/equipamentos-serializados/{self.created_eq_serial_1_id}")
                    if response.status_code == 200:
                        eq_serial = response.json()
                        status = eq_serial.get('status')
                        
                        if status == expected_status:
                            self.log(f"    ✅ Status changed to '{expected_status}'")
                        else:
                            self.log(f"    ❌ Status not changed correctly: expected '{expected_status}', got '{status}'", "ERROR")
                            return False
                else:
                    self.log(f"    ❌ Failed to create {movimento_tipo} movement: {response.status_code} - {response.text}", "ERROR")
                    return False
                    
            except Exception as e:
                self.log(f"    ❌ Error creating {movimento_tipo} movement: {str(e)}", "ERROR")
                return False
        
        # Test 8b: Non-Serialized Equipment Movements
        self.log("  8.3 Testing non-serialized equipment movements...")
        
        # First, verify initial stock is 0
        response = self.session.get(f"{BACKEND_URL}/equipamentos/{self.created_equipamento_cabo_id}")
        if response.status_code == 200:
            equipamento = response.json()
            initial_stock = equipamento.get('quantidade_estoque', 0)
            self.log(f"    Initial stock: {initial_stock}")
        else:
            self.log(f"    ❌ Failed to get equipamento: {response.status_code}", "ERROR")
            return False
        
        # Create movement: entrada
        self.log("    8.3.1 Testing entrada movement...")
        mov_data = {
            "tipo": "entrada",
            "data": "2024-01-20",
            "equipamento_id": self.created_equipamento_cabo_id,
            "quantidade": 100
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/movimentacoes", json=mov_data)
            
            if response.status_code == 200:
                self.log("    ✅ Entrada movement created successfully")
                
                # Verify stock increased
                response = self.session.get(f"{BACKEND_URL}/equipamentos/{self.created_equipamento_cabo_id}")
                if response.status_code == 200:
                    equipamento = response.json()
                    new_stock = equipamento.get('quantidade_estoque', 0)
                    expected_stock = initial_stock + 100
                    
                    if new_stock == expected_stock:
                        self.log(f"    ✅ Stock increased correctly to {new_stock}")
                    else:
                        self.log(f"    ❌ Stock not increased correctly: expected {expected_stock}, got {new_stock}", "ERROR")
                        return False
            else:
                self.log(f"    ❌ Failed to create entrada movement: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error creating entrada movement: {str(e)}", "ERROR")
            return False
        
        # Create movement: saida_venda (30 units)
        self.log("    8.3.2 Testing saida_venda movement...")
        mov_data = {
            "tipo": "saida_venda",
            "data": "2024-01-21",
            "equipamento_id": self.created_equipamento_cabo_id,
            "quantidade": 30,
            "cliente_id": self.created_cliente_id
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/movimentacoes", json=mov_data)
            
            if response.status_code == 200:
                self.log("    ✅ Saida_venda movement created successfully")
                
                # Verify stock decreased
                response = self.session.get(f"{BACKEND_URL}/equipamentos/{self.created_equipamento_cabo_id}")
                if response.status_code == 200:
                    equipamento = response.json()
                    new_stock = equipamento.get('quantidade_estoque', 0)
                    expected_stock = 100 - 30  # 70
                    
                    if new_stock == expected_stock:
                        self.log(f"    ✅ Stock decreased correctly to {new_stock}")
                    else:
                        self.log(f"    ❌ Stock not decreased correctly: expected {expected_stock}, got {new_stock}", "ERROR")
                        return False
            else:
                self.log(f"    ❌ Failed to create saida_venda movement: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error creating saida_venda movement: {str(e)}", "ERROR")
            return False
        
        # Test insufficient stock validation
        self.log("    8.3.3 Testing insufficient stock validation...")
        mov_data = {
            "tipo": "saida_venda",
            "data": "2024-01-22",
            "equipamento_id": self.created_equipamento_cabo_id,
            "quantidade": 200,  # More than available (70)
            "cliente_id": self.created_cliente_id
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/movimentacoes", json=mov_data)
            
            if response.status_code == 400:
                self.log("    ✅ Insufficient stock correctly rejected")
                response_data = response.json()
                if "insuficiente" in response_data.get('detail', '').lower():
                    self.log("    ✅ Correct error message about insufficient stock")
                else:
                    self.log(f"    ❌ Unexpected error message: {response_data.get('detail')}", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Insufficient stock should have been rejected: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error testing insufficient stock: {str(e)}", "ERROR")
            return False
        
        # Create movement: devolucao
        self.log("    8.3.4 Testing devolucao movement...")
        mov_data = {
            "tipo": "devolucao",
            "data": "2024-01-23",
            "equipamento_id": self.created_equipamento_cabo_id,
            "quantidade": 10
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/movimentacoes", json=mov_data)
            
            if response.status_code == 200:
                self.log("    ✅ Devolucao movement created successfully")
                
                # Verify stock increased
                response = self.session.get(f"{BACKEND_URL}/equipamentos/{self.created_equipamento_cabo_id}")
                if response.status_code == 200:
                    equipamento = response.json()
                    new_stock = equipamento.get('quantidade_estoque', 0)
                    expected_stock = 70 + 10  # 80
                    
                    if new_stock == expected_stock:
                        self.log(f"    ✅ Stock increased correctly to {new_stock}")
                    else:
                        self.log(f"    ❌ Stock not increased correctly: expected {expected_stock}, got {new_stock}", "ERROR")
                        return False
            else:
                self.log(f"    ❌ Failed to create devolucao movement: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error creating devolucao movement: {str(e)}", "ERROR")
            return False
        
        return True
    
    def test_movimentacoes_filters(self):
        """Test 9: List Movimentações with Filters"""
        self.log("Testing Movimentações filters...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        # Test LIST all movements
        self.log("  9.1 Testing LIST all movements...")
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/movimentacoes")
            
            if response.status_code == 200:
                movimentacoes = response.json()
                self.log(f"    ✅ Retrieved {len(movimentacoes)} total movements")
            else:
                self.log(f"    ❌ Failed to list movements: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error listing movements: {str(e)}", "ERROR")
            return False
        
        # Test FILTER by tipo
        self.log("  9.2 Testing FILTER by tipo='saida_locacao'...")
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/movimentacoes?tipo=saida_locacao")
            
            if response.status_code == 200:
                movimentacoes = response.json()
                self.log(f"    ✅ Retrieved {len(movimentacoes)} saida_locacao movements")
                
                # Verify all are saida_locacao
                all_correct_type = all(m.get('tipo') == 'saida_locacao' for m in movimentacoes)
                if all_correct_type:
                    self.log("    ✅ All filtered movements have correct tipo")
                else:
                    self.log("    ❌ Some filtered movements have incorrect tipo", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to filter by tipo: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error filtering by tipo: {str(e)}", "ERROR")
            return False
        
        # Test FILTER by cliente_id
        self.log("  9.3 Testing FILTER by cliente_id...")
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/movimentacoes?cliente_id={self.created_cliente_id}")
            
            if response.status_code == 200:
                movimentacoes = response.json()
                self.log(f"    ✅ Retrieved {len(movimentacoes)} movements for cliente")
                
                # Verify all have correct cliente_id
                all_correct_cliente = all(m.get('cliente_id') == self.created_cliente_id for m in movimentacoes if m.get('cliente_id'))
                if all_correct_cliente:
                    self.log("    ✅ All filtered movements have correct cliente_id")
                else:
                    self.log("    ❌ Some filtered movements have incorrect cliente_id", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to filter by cliente_id: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error filtering by cliente_id: {str(e)}", "ERROR")
            return False
        
        # Test FILTER by equipamento_id
        self.log("  9.4 Testing FILTER by equipamento_id...")
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/movimentacoes?equipamento_id={self.created_equipamento_router_id}")
            
            if response.status_code == 200:
                movimentacoes = response.json()
                self.log(f"    ✅ Retrieved {len(movimentacoes)} movements for equipamento")
                
                # Verify all have correct equipamento_id
                all_correct_equipamento = all(m.get('equipamento_id') == self.created_equipamento_router_id for m in movimentacoes)
                if all_correct_equipamento:
                    self.log("    ✅ All filtered movements have correct equipamento_id")
                else:
                    self.log("    ❌ Some filtered movements have incorrect equipamento_id", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to filter by equipamento_id: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error filtering by equipamento_id: {str(e)}", "ERROR")
            return False
        
        return True
    
    def cleanup_inventory_test_data(self):
        """Clean up all created inventory test data"""
        self.log("Cleaning up inventory test data...")
        
        cleanup_items = [
            (f"/equipamentos-serializados/{self.created_eq_serial_2_id}", "Equipamento Serializado 2"),
            (f"/equipamentos/{self.created_equipamento_cabo_id}", "Equipamento Cabo"),
            (f"/categorias-equipamentos/{self.created_categoria_cabos_id}", "Categoria Cabos"),
            (f"/categorias-equipamentos/{self.created_categoria_roteadores_id}", "Categoria Roteadores"),
            (f"/locais/{self.created_local_id}", "Local"),
            (f"/fornecedores/{self.created_fornecedor_id}", "Fornecedor"),
            (f"/clientes/{self.created_cliente_id}", "Cliente")
        ]
        
        for endpoint, item_name in cleanup_items:
            if endpoint.split('/')[-1] != "None":  # Only delete if ID exists
                try:
                    response = self.session.delete(f"{BACKEND_URL}{endpoint}")
                    if response.status_code == 200:
                        self.log(f"    ✅ {item_name} deleted successfully")
                    else:
                        self.log(f"    ⚠️ Failed to delete {item_name}: {response.status_code}")
                except:
                    self.log(f"    ⚠️ Error deleting {item_name}")
    
    def test_investimentos_crud(self):
        """Test 2: Investimentos CRUD Operations"""
        self.log("Testing Investimentos CRUD operations...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        # Test CREATE Investment
        self.log("  2.1 Testing CREATE investment...")
        investment_data = {
            "nome": "CDB Banco XYZ",
            "tipo": "renda_fixa",
            "valor_investido": 10000.0,
            "valor_atual": 10500.0,
            "data_aplicacao": "2024-01-15",
            "rentabilidade_percentual": 5.0,
            "instituicao": "Banco XYZ"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/investimentos", json=investment_data)
            
            if response.status_code == 200:
                created_investment = response.json()
                self.created_investment_id = created_investment.get('id')
                self.log("    ✅ Investment created successfully")
                self.log(f"       ID: {self.created_investment_id}")
                self.log(f"       Nome: {created_investment.get('nome')}")
                self.log(f"       Valor Investido: R$ {created_investment.get('valor_investido')}")
                self.log(f"       Valor Atual: R$ {created_investment.get('valor_atual')}")
                self.log(f"       Rentabilidade: {created_investment.get('rentabilidade_percentual')}%")
            else:
                self.log(f"    ❌ Failed to create investment: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error creating investment: {str(e)}", "ERROR")
            return False
        
        # Test LIST Investments
        self.log("  2.2 Testing LIST investments...")
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/investimentos")
            
            if response.status_code == 200:
                investments = response.json()
                self.log(f"    ✅ Retrieved {len(investments)} investments")
                
                # Verify created investment appears in list
                found_investment = None
                for inv in investments:
                    if inv.get('id') == self.created_investment_id:
                        found_investment = inv
                        break
                
                if found_investment:
                    self.log("    ✅ Created investment found in list")
                    self.log(f"       Nome: {found_investment.get('nome')}")
                    self.log(f"       Tipo: {found_investment.get('tipo')}")
                else:
                    self.log("    ❌ Created investment NOT found in list", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to list investments: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error listing investments: {str(e)}", "ERROR")
            return False
        
        # Test UPDATE Investment
        self.log("  2.3 Testing UPDATE investment...")
        update_data = {
            "nome": "CDB Banco XYZ",
            "tipo": "renda_fixa",
            "valor_investido": 10000.0,
            "valor_atual": 10800.0,  # Updated value
            "data_aplicacao": "2024-01-15",
            "rentabilidade_percentual": 8.0,  # Updated percentage
            "instituicao": "Banco XYZ"
        }
        
        try:
            response = self.session.put(f"{BACKEND_URL}/investimentos/{self.created_investment_id}", json=update_data)
            
            if response.status_code == 200:
                updated_investment = response.json()
                self.log("    ✅ Investment updated successfully")
                self.log(f"       New Valor Atual: R$ {updated_investment.get('valor_atual')}")
                self.log(f"       New Rentabilidade: {updated_investment.get('rentabilidade_percentual')}%")
                
                # Verify the update
                if updated_investment.get('valor_atual') == 10800.0:
                    self.log("    ✅ Valor atual updated correctly")
                else:
                    self.log(f"    ❌ Valor atual not updated correctly: {updated_investment.get('valor_atual')}", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to update investment: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error updating investment: {str(e)}", "ERROR")
            return False
        
        # Test DELETE Investment
        self.log("  2.4 Testing DELETE investment...")
        try:
            response = self.session.delete(f"{BACKEND_URL}/investimentos/{self.created_investment_id}")
            
            if response.status_code == 200:
                self.log("    ✅ Investment deleted successfully")
                
                # Verify investment no longer in list
                response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/investimentos")
                if response.status_code == 200:
                    investments = response.json()
                    found_deleted = any(inv.get('id') == self.created_investment_id for inv in investments)
                    
                    if not found_deleted:
                        self.log("    ✅ Investment no longer appears in list")
                        return True
                    else:
                        self.log("    ❌ Investment still appears in list after deletion", "ERROR")
                        return False
                else:
                    self.log(f"    ❌ Failed to verify deletion: {response.status_code}", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to delete investment: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error deleting investment: {str(e)}", "ERROR")
            return False
    
    def test_cartoes_crud(self):
        """Test 3: Cartões de Crédito CRUD Operations"""
        self.log("Testing Cartões de Crédito CRUD operations...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        # Test CREATE Credit Card
        self.log("  3.1 Testing CREATE credit card...")
        card_data = {
            "nome": "Nubank Platinum",
            "bandeira": "Mastercard",
            "limite_total": 5000.0,
            "dia_fechamento": 10,
            "dia_vencimento": 15
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/cartoes", json=card_data)
            
            if response.status_code == 200:
                created_card = response.json()
                self.created_card_id = created_card.get('id')
                self.log("    ✅ Credit card created successfully")
                self.log(f"       ID: {self.created_card_id}")
                self.log(f"       Nome: {created_card.get('nome')}")
                self.log(f"       Bandeira: {created_card.get('bandeira')}")
                self.log(f"       Limite Total: R$ {created_card.get('limite_total')}")
                self.log(f"       Limite Disponível: R$ {created_card.get('limite_disponivel')}")
                self.log(f"       Fatura Atual: R$ {created_card.get('fatura_atual')}")
                
                # Verify initial values
                if created_card.get('limite_disponivel') == 5000.0:
                    self.log("    ✅ Limite disponível initialized correctly")
                else:
                    self.log(f"    ❌ Limite disponível incorrect: {created_card.get('limite_disponivel')}", "ERROR")
                    return False
                    
                if created_card.get('fatura_atual') == 0.0:
                    self.log("    ✅ Fatura atual initialized correctly")
                else:
                    self.log(f"    ❌ Fatura atual incorrect: {created_card.get('fatura_atual')}", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to create credit card: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error creating credit card: {str(e)}", "ERROR")
            return False
        
        # Test LIST Credit Cards
        self.log("  3.2 Testing LIST credit cards...")
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/cartoes")
            
            if response.status_code == 200:
                cards = response.json()
                self.log(f"    ✅ Retrieved {len(cards)} credit cards")
                
                # Verify created card appears in list
                found_card = None
                for card in cards:
                    if card.get('id') == self.created_card_id:
                        found_card = card
                        break
                
                if found_card:
                    self.log("    ✅ Created credit card found in list")
                    self.log(f"       Nome: {found_card.get('nome')}")
                    self.log(f"       Bandeira: {found_card.get('bandeira')}")
                    self.log(f"       Limite Total: R$ {found_card.get('limite_total')}")
                else:
                    self.log("    ❌ Created credit card NOT found in list", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to list credit cards: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error listing credit cards: {str(e)}", "ERROR")
            return False
        
        # Test UPDATE Credit Card
        self.log("  3.3 Testing UPDATE credit card...")
        update_data = {
            "nome": "Nubank Platinum",
            "bandeira": "Mastercard",
            "limite_total": 8000.0,  # Updated limit
            "dia_fechamento": 10,
            "dia_vencimento": 15
        }
        
        try:
            response = self.session.put(f"{BACKEND_URL}/cartoes/{self.created_card_id}", json=update_data)
            
            if response.status_code == 200:
                updated_card = response.json()
                self.log("    ✅ Credit card updated successfully")
                self.log(f"       New Limite Total: R$ {updated_card.get('limite_total')}")
                
                # Verify the update
                if updated_card.get('limite_total') == 8000.0:
                    self.log("    ✅ Limite total updated correctly")
                else:
                    self.log(f"    ❌ Limite total not updated correctly: {updated_card.get('limite_total')}", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to update credit card: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error updating credit card: {str(e)}", "ERROR")
            return False
        
        # Test DELETE Credit Card
        self.log("  3.4 Testing DELETE credit card...")
        try:
            response = self.session.delete(f"{BACKEND_URL}/cartoes/{self.created_card_id}")
            
            if response.status_code == 200:
                self.log("    ✅ Credit card deleted successfully")
                
                # Verify card no longer in list
                response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/cartoes")
                if response.status_code == 200:
                    cards = response.json()
                    found_deleted = any(card.get('id') == self.created_card_id for card in cards)
                    
                    if not found_deleted:
                        self.log("    ✅ Credit card no longer appears in list")
                        return True
                    else:
                        self.log("    ❌ Credit card still appears in list after deletion", "ERROR")
                        return False
                else:
                    self.log(f"    ❌ Failed to verify deletion: {response.status_code}", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to delete credit card: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error deleting credit card: {str(e)}", "ERROR")
            return False
    
    def test_transaction_integration(self):
        """Test 4: Transaction Integration with Accounts and Cards"""
        self.log("Testing transaction integration with accounts and cards...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        # First, we need to get or create categories and cost centers
        self.log("  4.1 Setting up categories and cost centers...")
        
        # Get existing categories
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/categorias")
            if response.status_code == 200:
                categories = response.json()
                if categories:
                    categoria_id = categories[0]['id']
                    self.log(f"    ✅ Using existing category: {categories[0]['nome']}")
                else:
                    # Create a category
                    cat_data = {"nome": "Teste", "tipo": "despesa"}
                    response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/categorias", json=cat_data)
                    if response.status_code == 200:
                        categoria_id = response.json()['id']
                        self.log("    ✅ Created test category")
                    else:
                        self.log(f"    ❌ Failed to create category: {response.status_code}", "ERROR")
                        return False
            else:
                self.log(f"    ❌ Failed to get categories: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"    ❌ Error with categories: {str(e)}", "ERROR")
            return False
        
        # Get existing cost centers
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/centros-custo")
            if response.status_code == 200:
                cost_centers = response.json()
                if cost_centers:
                    centro_custo_id = cost_centers[0]['id']
                    self.log(f"    ✅ Using existing cost center: {cost_centers[0]['nome']}")
                else:
                    # Create a cost center
                    cc_data = {"nome": "Teste", "area": "Operação"}
                    response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/centros-custo", json=cc_data)
                    if response.status_code == 200:
                        centro_custo_id = response.json()['id']
                        self.log("    ✅ Created test cost center")
                    else:
                        self.log(f"    ❌ Failed to create cost center: {response.status_code}", "ERROR")
                        return False
            else:
                self.log(f"    ❌ Failed to get cost centers: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"    ❌ Error with cost centers: {str(e)}", "ERROR")
            return False
        
        # Create a bank account
        self.log("  4.2 Creating bank account...")
        account_data = {
            "nome": "Conta Teste",
            "tipo": "corrente",
            "banco": "Banco Teste",
            "agencia": "1234",
            "numero_conta": "56789-0",
            "saldo_inicial": 1000.0
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/contas", json=account_data)
            
            if response.status_code == 200:
                created_account = response.json()
                self.created_account_id = created_account.get('id')
                initial_balance = created_account.get('saldo_atual')
                self.log(f"    ✅ Bank account created with initial balance: R$ {initial_balance}")
            else:
                self.log(f"    ❌ Failed to create bank account: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"    ❌ Error creating bank account: {str(e)}", "ERROR")
            return False
        
        # Create a credit card
        self.log("  4.3 Creating credit card...")
        card_data = {
            "nome": "Cartão Teste",
            "bandeira": "Visa",
            "limite_total": 2000.0,
            "dia_fechamento": 5,
            "dia_vencimento": 10
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/cartoes", json=card_data)
            
            if response.status_code == 200:
                created_card = response.json()
                self.created_card_id = created_card.get('id')
                initial_limit = created_card.get('limite_disponivel')
                initial_invoice = created_card.get('fatura_atual')
                self.log(f"    ✅ Credit card created with limit: R$ {initial_limit}, invoice: R$ {initial_invoice}")
            else:
                self.log(f"    ❌ Failed to create credit card: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"    ❌ Error creating credit card: {str(e)}", "ERROR")
            return False
        
        # Test RECEITA transaction linked to bank account
        self.log("  4.4 Testing RECEITA transaction (bank account)...")
        receita_data = {
            "tipo": "receita",
            "fornecedor": "Cliente Teste",
            "descricao": "Pagamento de serviço",
            "valor_total": 1000.0,
            "data_competencia": "2024-01-20",
            "categoria_id": categoria_id,
            "centro_custo_id": centro_custo_id,
            "conta_bancaria_id": self.created_account_id
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/transacoes", json=receita_data)
            
            if response.status_code == 200:
                self.log("    ✅ RECEITA transaction created")
                
                # Verify account balance increased
                response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/contas")
                if response.status_code == 200:
                    accounts = response.json()
                    test_account = next((acc for acc in accounts if acc['id'] == self.created_account_id), None)
                    
                    if test_account:
                        new_balance = test_account.get('saldo_atual')
                        expected_balance = 1000.0 + 1000.0  # initial + receita
                        
                        if new_balance == expected_balance:
                            self.log(f"    ✅ Account balance updated correctly: R$ {new_balance}")
                        else:
                            self.log(f"    ❌ Account balance incorrect: expected R$ {expected_balance}, got R$ {new_balance}", "ERROR")
                            return False
                    else:
                        self.log("    ❌ Test account not found", "ERROR")
                        return False
                else:
                    self.log(f"    ❌ Failed to get updated accounts: {response.status_code}", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to create RECEITA transaction: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"    ❌ Error creating RECEITA transaction: {str(e)}", "ERROR")
            return False
        
        # Test DESPESA transaction linked to bank account
        self.log("  4.5 Testing DESPESA transaction (bank account)...")
        despesa_data = {
            "tipo": "despesa",
            "fornecedor": "Fornecedor Teste",
            "descricao": "Compra de material",
            "valor_total": 300.0,
            "data_competencia": "2024-01-21",
            "categoria_id": categoria_id,
            "centro_custo_id": centro_custo_id,
            "conta_bancaria_id": self.created_account_id
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/transacoes", json=despesa_data)
            
            if response.status_code == 200:
                self.log("    ✅ DESPESA transaction created")
                
                # Verify account balance decreased
                response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/contas")
                if response.status_code == 200:
                    accounts = response.json()
                    test_account = next((acc for acc in accounts if acc['id'] == self.created_account_id), None)
                    
                    if test_account:
                        new_balance = test_account.get('saldo_atual')
                        expected_balance = 2000.0 - 300.0  # previous balance - despesa
                        
                        if new_balance == expected_balance:
                            self.log(f"    ✅ Account balance updated correctly: R$ {new_balance}")
                        else:
                            self.log(f"    ❌ Account balance incorrect: expected R$ {expected_balance}, got R$ {new_balance}", "ERROR")
                            return False
                    else:
                        self.log("    ❌ Test account not found", "ERROR")
                        return False
                else:
                    self.log(f"    ❌ Failed to get updated accounts: {response.status_code}", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to create DESPESA transaction: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"    ❌ Error creating DESPESA transaction: {str(e)}", "ERROR")
            return False
        
        # Test DESPESA transaction linked to credit card
        self.log("  4.6 Testing DESPESA transaction (credit card)...")
        card_despesa_data = {
            "tipo": "despesa",
            "fornecedor": "Loja Teste",
            "descricao": "Compra no cartão",
            "valor_total": 500.0,
            "data_competencia": "2024-01-22",
            "categoria_id": categoria_id,
            "centro_custo_id": centro_custo_id,
            "cartao_credito_id": self.created_card_id
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/transacoes", json=card_despesa_data)
            
            if response.status_code == 200:
                self.log("    ✅ Credit card DESPESA transaction created")
                
                # Verify card invoice and limit updated
                response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/cartoes")
                if response.status_code == 200:
                    cards = response.json()
                    test_card = next((card for card in cards if card['id'] == self.created_card_id), None)
                    
                    if test_card:
                        new_invoice = test_card.get('fatura_atual')
                        new_limit = test_card.get('limite_disponivel')
                        expected_invoice = 500.0  # despesa amount
                        expected_limit = 2000.0 - 500.0  # total limit - despesa
                        
                        if new_invoice == expected_invoice:
                            self.log(f"    ✅ Card invoice updated correctly: R$ {new_invoice}")
                        else:
                            self.log(f"    ❌ Card invoice incorrect: expected R$ {expected_invoice}, got R$ {new_invoice}", "ERROR")
                            return False
                            
                        if new_limit == expected_limit:
                            self.log(f"    ✅ Card available limit updated correctly: R$ {new_limit}")
                        else:
                            self.log(f"    ❌ Card limit incorrect: expected R$ {expected_limit}, got R$ {new_limit}", "ERROR")
                            return False
                    else:
                        self.log("    ❌ Test card not found", "ERROR")
                        return False
                else:
                    self.log(f"    ❌ Failed to get updated cards: {response.status_code}", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to create credit card DESPESA transaction: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"    ❌ Error creating credit card DESPESA transaction: {str(e)}", "ERROR")
            return False
        
        self.log("  4.7 Cleaning up test data...")
        # Clean up created test data
        try:
            if self.created_account_id:
                self.session.delete(f"{BACKEND_URL}/contas/{self.created_account_id}")
            if self.created_card_id:
                self.session.delete(f"{BACKEND_URL}/cartoes/{self.created_card_id}")
            self.log("    ✅ Test data cleaned up")
        except:
            pass  # Ignore cleanup errors
        
        return True
    
    def run_all_tests(self):
        """Run all test scenarios"""
        self.log("=" * 80)
        self.log("STARTING ECHO SHOP FinAI - INVESTMENTS & CREDIT CARDS CRUD TESTS")
        self.log("=" * 80)
        
        results = {
            'login': False,
            'investimentos_crud': False,
            'cartoes_crud': False,
            'transaction_integration': False
        }
        
        # Test 1: Admin Login
        results['login'] = self.test_admin_login()
        
        if not results['login']:
            self.log("❌ Cannot continue without successful login", "ERROR")
            return results
        
        # Test 2: Investimentos CRUD
        results['investimentos_crud'] = self.test_investimentos_crud()
        
        # Test 3: Cartões de Crédito CRUD
        results['cartoes_crud'] = self.test_cartoes_crud()
        
        # Test 4: Transaction Integration
        results['transaction_integration'] = self.test_transaction_integration()
        
        # Summary
        self.log("=" * 80)
        self.log("TEST RESULTS SUMMARY")
        self.log("=" * 80)
        
        for test_name, passed in results.items():
            status = "✅ PASS" if passed else "❌ FAIL"
            self.log(f"{test_name.replace('_', ' ').title()}: {status}")
        
        total_tests = len(results)
        passed_tests = sum(results.values())
        
        self.log(f"\nOverall: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            self.log("🎉 ALL TESTS PASSED - Investments & Credit Cards CRUD operations working correctly!")
        else:
            self.log("⚠️ SOME TESTS FAILED - Issues detected with CRUD operations")
        
        return results

if __name__ == "__main__":
    tester = FinAITestRunner()
    results = tester.run_all_tests()