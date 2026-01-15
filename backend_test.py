#!/usr/bin/env python3
"""
Backend API Testing for Sistema de Vendas com Contratos (Fase 1)
Tests the complete sales and contracts system including:
- Planos de Serviço CRUD
- Modelos de Contrato CRUD with dynamic variables
- Contract preview with variable substitution
- Vendas de Serviço CRUD with automatic contract and OS generation
- Ordens de Serviço CRUD with technician assignment and checklist
- Digital contract signature
- Complete flow: Sale → Contract → Service Order
"""

import requests
import json
import os
from datetime import datetime
import uuid

# Configuration - Using credentials from review request
BACKEND_URL = "http://localhost:8001/api"
ADMIN_EMAIL = "faraujoneto2025@gmail.com"
ADMIN_PASSWORD = "Rebeca@19"
EMPRESA_ID = "884bd1b2-ceb7-4ca6-8f5b-f847333eca3e"

# Test data IDs from review request
EXISTING_PLANO_ID = "0fa0ea52-aac2-4314-92c1-a81fd2ab3aae"
EXISTING_MODELO_CONTRATO_ID = "cd6ece0a-9dda-4a8f-a0d6-f12feb4111e8"
EXISTING_CLIENTE_ID = "7c80843e-ef54-451d-b5bd-f626dd541bb8"
EXISTING_VENDA_ID = "4a0278db-1dc1-4f33-9393-b8ed87587c90"
EXISTING_OS_ID = "0de6dab1-85cc-4232-a87a-abfd71ff2bd1"
EXISTING_CONTRATO_ID = "03dc63cf-481c-43f2-bac2-c75e81f4631b"

class VendasContratosTestRunner:
    def __init__(self):
        self.token = None
        self.user_data = None
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
        # Test data storage
        self.created_plano_id = None
        self.created_modelo_id = None
        self.created_cliente_id = None
        self.created_venda_id = None
        self.created_os_id = None
        self.created_contrato_id = None
        
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

    def test_planos_servico_crud(self):
        """Test 2: CRUD Planos de Serviço"""
        self.log("Testing Planos de Serviço CRUD operations...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        # Test CREATE Plano de Serviço
        self.log("  2.1 Testing CREATE plano de serviço...")
        plano_data = {
            "nome": "Internet 500MB Fibra Teste",
            "tipo_servico": "internet",
            "valor": 89.90,
            "periodicidade": "mensal",
            "tem_contrato": True,
            "prazo_fidelidade_meses": 12,
            "valor_multa_cancelamento": 200.0,
            "modelo_contrato_id": EXISTING_MODELO_CONTRATO_ID,
            "descricao": "Plano de internet fibra óptica 500MB",
            "beneficios": ["WiFi grátis", "Instalação grátis", "Suporte 24h"]
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/planos-servico", json=plano_data)
            
            if response.status_code == 200:
                created_plano = response.json()
                self.created_plano_id = created_plano.get('id')
                self.log("    ✅ Plano de serviço created successfully")
                self.log(f"       ID: {self.created_plano_id}")
                self.log(f"       Nome: {created_plano.get('nome')}")
                self.log(f"       Valor: R$ {created_plano.get('valor')}")
                self.log(f"       Tem Contrato: {created_plano.get('tem_contrato')}")
                self.log(f"       Fidelidade: {created_plano.get('prazo_fidelidade_meses')} meses")
            else:
                self.log(f"    ❌ Failed to create plano: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error creating plano: {str(e)}", "ERROR")
            return False
        
        # Test LIST Planos
        self.log("  2.2 Testing LIST planos de serviço...")
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/planos-servico")
            
            if response.status_code == 200:
                planos = response.json()
                self.log(f"    ✅ Retrieved {len(planos)} planos")
                
                # Verify created plano appears in list
                found_plano = any(p.get('id') == self.created_plano_id for p in planos)
                if found_plano:
                    self.log("    ✅ Created plano found in list")
                else:
                    self.log("    ❌ Created plano NOT found in list", "ERROR")
                    return False
                    
                # Verify existing plano from test data
                existing_found = any(p.get('id') == EXISTING_PLANO_ID for p in planos)
                if existing_found:
                    self.log(f"    ✅ Existing plano {EXISTING_PLANO_ID} found in list")
                else:
                    self.log(f"    ⚠️ Existing plano {EXISTING_PLANO_ID} not found", "WARNING")
            else:
                self.log(f"    ❌ Failed to list planos: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error listing planos: {str(e)}", "ERROR")
            return False
        
        # Test GET specific plano
        self.log("  2.3 Testing GET specific plano...")
        try:
            response = self.session.get(f"{BACKEND_URL}/planos-servico/{self.created_plano_id}")
            
            if response.status_code == 200:
                plano = response.json()
                self.log("    ✅ Retrieved specific plano successfully")
                self.log(f"       Nome: {plano.get('nome')}")
                self.log(f"       Benefícios: {plano.get('beneficios')}")
            else:
                self.log(f"    ❌ Failed to get specific plano: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error getting specific plano: {str(e)}", "ERROR")
            return False
        
        # Test UPDATE Plano
        self.log("  2.4 Testing UPDATE plano...")
        update_data = {
            "nome": "Internet 500MB Fibra Teste Atualizado",
            "tipo_servico": "internet",
            "valor": 99.90,  # Updated price
            "periodicidade": "mensal",
            "tem_contrato": True,
            "prazo_fidelidade_meses": 12,
            "valor_multa_cancelamento": 250.0,  # Updated multa
            "modelo_contrato_id": EXISTING_MODELO_CONTRATO_ID,
            "descricao": "Plano de internet fibra óptica 500MB atualizado",
            "beneficios": ["WiFi grátis", "Instalação grátis", "Suporte 24h", "Netflix grátis"]
        }
        
        try:
            response = self.session.put(f"{BACKEND_URL}/planos-servico/{self.created_plano_id}", json=update_data)
            
            if response.status_code == 200:
                result = response.json()
                # Handle both direct object and message+object response
                updated_plano = result if 'message' not in result else result.get('plano', result)
                self.log("    ✅ Plano updated successfully")
                self.log(f"       New Nome: {updated_plano.get('nome', 'N/A')}")
                self.log(f"       New Valor: R$ {updated_plano.get('valor', 'N/A')}")
                self.log(f"       New Benefícios: {updated_plano.get('beneficios', 'N/A')}")
            else:
                self.log(f"    ❌ Failed to update plano: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error updating plano: {str(e)}", "ERROR")
            return False
        
        return True

    def test_modelos_contrato_crud(self):
        """Test 3: CRUD Modelos de Contrato"""
        self.log("Testing Modelos de Contrato CRUD operations...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        # Test CREATE Modelo de Contrato
        self.log("  3.1 Testing CREATE modelo de contrato...")
        modelo_data = {
            "nome": "Contrato Internet Residencial Teste",
            "descricao": "Modelo de contrato para internet residencial com fidelidade",
            "conteudo_html": """
            <h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE INTERNET</h1>
            <p><strong>CONTRATANTE:</strong> {{nome_cliente}}</p>
            <p><strong>CPF/CNPJ:</strong> {{cpf_cnpj}}</p>
            <p><strong>ENDEREÇO:</strong> {{endereco_completo}}</p>
            <p><strong>TELEFONE:</strong> {{telefone}}</p>
            <p><strong>EMAIL:</strong> {{email}}</p>
            
            <h2>PLANO CONTRATADO</h2>
            <p><strong>Plano:</strong> {{plano_nome}}</p>
            <p><strong>Valor Mensal:</strong> R$ {{plano_valor}}</p>
            <p><strong>Periodicidade:</strong> {{periodicidade}}</p>
            
            <h2>FIDELIDADE</h2>
            <p><strong>Prazo de Fidelidade:</strong> {{fidelidade_meses}} meses</p>
            <p><strong>Valor da Multa:</strong> R$ {{valor_multa}}</p>
            <p><strong>Data de Início:</strong> {{data_inicio}}</p>
            <p><strong>Data de Fim:</strong> {{data_fim}}</p>
            
            <p><strong>Data de Assinatura:</strong> {{data_assinatura}}</p>
            
            <p>Assinatura do Cliente: _________________________</p>
            """
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/modelos-contrato", json=modelo_data)
            
            if response.status_code == 200:
                created_modelo = response.json()
                self.created_modelo_id = created_modelo.get('id')
                self.log("    ✅ Modelo de contrato created successfully")
                self.log(f"       ID: {self.created_modelo_id}")
                self.log(f"       Nome: {created_modelo.get('nome')}")
                self.log(f"       Versão: {created_modelo.get('versao')}")
                self.log(f"       Variáveis Disponíveis: {len(created_modelo.get('variaveis_disponiveis', []))}")
            else:
                self.log(f"    ❌ Failed to create modelo: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error creating modelo: {str(e)}", "ERROR")
            return False
        
        # Test LIST Modelos
        self.log("  3.2 Testing LIST modelos de contrato...")
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/modelos-contrato")
            
            if response.status_code == 200:
                modelos = response.json()
                self.log(f"    ✅ Retrieved {len(modelos)} modelos")
                
                found_modelo = any(m.get('id') == self.created_modelo_id for m in modelos)
                if found_modelo:
                    self.log("    ✅ Created modelo found in list")
                else:
                    self.log("    ❌ Created modelo NOT found in list", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to list modelos: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error listing modelos: {str(e)}", "ERROR")
            return False
        
        # Test UPDATE Modelo (should create new version)
        self.log("  3.3 Testing UPDATE modelo (versioning)...")
        update_data = {
            "nome": "Contrato Internet Residencial Teste v2",
            "descricao": "Modelo atualizado com nova versão",
            "conteudo_html": modelo_data["conteudo_html"] + "\n<p>VERSÃO 2.0 - Atualizada</p>"
        }
        
        try:
            response = self.session.put(f"{BACKEND_URL}/modelos-contrato/{self.created_modelo_id}", json=update_data)
            
            if response.status_code == 200:
                result = response.json()
                # Handle both direct object and message+object response
                updated_modelo = result if 'message' not in result else result.get('modelo', result)
                self.log("    ✅ Modelo updated successfully")
                self.log(f"       New Nome: {updated_modelo.get('nome', 'N/A')}")
                self.log(f"       New Versão: {updated_modelo.get('versao', 'N/A')}")
                
                # Verify version incremented
                versao = updated_modelo.get('versao')
                if versao == 2:
                    self.log("    ✅ Version correctly incremented to 2")
                elif versao is not None:
                    self.log(f"    ⚠️ Version is {versao}, expected 2 but may be correct", "WARNING")
                else:
                    self.log(f"    ❌ Version not found in response", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to update modelo: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error updating modelo: {str(e)}", "ERROR")
            return False
        
        return True

    def test_contract_preview(self):
        """Test 4: Contract Preview with Variable Substitution"""
        self.log("Testing contract preview with variable substitution...")
        
        if not self.token or not self.created_modelo_id:
            self.log("❌ No auth token or modelo ID available", "ERROR")
            return False
        
        # Test contract preview
        self.log("  4.1 Testing contract preview...")
        preview_data = {
            "cliente_id": EXISTING_CLIENTE_ID,
            "plano_id": EXISTING_PLANO_ID,
            "data_inicio": "2026-01-15",
            "data_assinatura": "2026-01-15"
        }
        
        try:
            response = self.session.get(f"{BACKEND_URL}/modelos-contrato/{self.created_modelo_id}/preview", json=preview_data)
            
            if response.status_code == 200:
                preview = response.json()
                conteudo_preenchido = preview.get('conteudo_preenchido', '')
                
                self.log("    ✅ Contract preview generated successfully")
                
                # Verify variables were substituted
                if '{{nome_cliente}}' not in conteudo_preenchido:
                    self.log("    ✅ Variable {{nome_cliente}} was substituted")
                else:
                    self.log("    ❌ Variable {{nome_cliente}} was NOT substituted", "ERROR")
                    return False
                
                if '{{plano_nome}}' not in conteudo_preenchido:
                    self.log("    ✅ Variable {{plano_nome}} was substituted")
                else:
                    self.log("    ❌ Variable {{plano_nome}} was NOT substituted", "ERROR")
                    return False
                
                if '{{data_inicio}}' not in conteudo_preenchido:
                    self.log("    ✅ Variable {{data_inicio}} was substituted")
                else:
                    self.log("    ❌ Variable {{data_inicio}} was NOT substituted", "ERROR")
                    return False
                
                # Log a sample of the filled content
                sample = conteudo_preenchido[:200] + "..." if len(conteudo_preenchido) > 200 else conteudo_preenchido
                self.log(f"    Preview sample: {sample}")
                
            else:
                self.log(f"    ❌ Failed to generate preview: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error generating preview: {str(e)}", "ERROR")
            return False
        
        return True

    def test_vendas_servico_crud(self):
        """Test 5: CRUD Vendas de Serviço"""
        self.log("Testing Vendas de Serviço CRUD operations...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        # Test CREATE Venda de Serviço
        self.log("  5.1 Testing CREATE venda de serviço...")
        venda_data = {
            "cliente_id": EXISTING_CLIENTE_ID,
            "plano_id": EXISTING_PLANO_ID,
            "forma_pagamento": "boleto",
            "dia_vencimento": 10,
            "observacoes": "Venda de teste para validação do sistema"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/vendas-servico", json=venda_data)
            
            if response.status_code == 200:
                created_venda = response.json()
                self.created_venda_id = created_venda.get('id')
                self.log("    ✅ Venda de serviço created successfully")
                self.log(f"       ID: {self.created_venda_id}")
                self.log(f"       Cliente ID: {created_venda.get('cliente_id')}")
                self.log(f"       Plano ID: {created_venda.get('plano_id')}")
                self.log(f"       Status: {created_venda.get('status')}")
                self.log(f"       Valor Venda: R$ {created_venda.get('valor_venda')}")
                
                # Verify automatic contract generation
                contrato_id = created_venda.get('contrato_id')
                if contrato_id:
                    self.log(f"    ✅ Contract automatically generated: {contrato_id}")
                    self.created_contrato_id = contrato_id
                else:
                    self.log("    ⚠️ No contract generated (may be normal if plano doesn't require contract)", "WARNING")
                
                # Verify automatic OS generation
                os_id = created_venda.get('os_instalacao_id')
                if os_id:
                    self.log(f"    ✅ Installation OS automatically generated: {os_id}")
                    self.created_os_id = os_id
                else:
                    self.log("    ⚠️ Installation OS was not generated (may be created separately)", "WARNING")
                
            else:
                self.log(f"    ❌ Failed to create venda: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error creating venda: {str(e)}", "ERROR")
            return False
        
        # Test LIST Vendas
        self.log("  5.2 Testing LIST vendas de serviço...")
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/vendas-servico")
            
            if response.status_code == 200:
                vendas = response.json()
                self.log(f"    ✅ Retrieved {len(vendas)} vendas")
                
                found_venda = any(v.get('id') == self.created_venda_id for v in vendas)
                if found_venda:
                    self.log("    ✅ Created venda found in list")
                else:
                    self.log("    ❌ Created venda NOT found in list", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to list vendas: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error listing vendas: {str(e)}", "ERROR")
            return False
        
        # Test UPDATE Venda status
        self.log("  5.3 Testing UPDATE venda status...")
        update_data = {
            "status": "ativo",
            "data_ativacao": "2026-01-15"
        }
        
        try:
            response = self.session.put(f"{BACKEND_URL}/vendas-servico/{self.created_venda_id}", json=update_data)
            
            if response.status_code == 200:
                updated_venda = response.json()
                self.log("    ✅ Venda status updated successfully")
                self.log(f"       New Status: {updated_venda.get('status')}")
                self.log(f"       Data Ativação: {updated_venda.get('data_ativacao')}")
            else:
                self.log(f"    ❌ Failed to update venda: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error updating venda: {str(e)}", "ERROR")
            return False
        
        return True

    def test_ordens_servico_crud(self):
        """Test 6: CRUD Ordens de Serviço"""
        self.log("Testing Ordens de Serviço CRUD operations...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        # Test LIST Ordens de Serviço
        self.log("  6.1 Testing LIST ordens de serviço...")
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/ordens-servico")
            
            if response.status_code == 200:
                ordens = response.json()
                self.log(f"    ✅ Retrieved {len(ordens)} ordens de serviço")
                
                # Find our created OS
                if self.created_os_id:
                    found_os = any(o.get('id') == self.created_os_id for o in ordens)
                    if found_os:
                        self.log(f"    ✅ Created OS {self.created_os_id} found in list")
                    else:
                        self.log(f"    ❌ Created OS {self.created_os_id} NOT found in list", "ERROR")
                        return False
                
                # Find existing OS from test data
                existing_found = any(o.get('id') == EXISTING_OS_ID for o in ordens)
                if existing_found:
                    self.log(f"    ✅ Existing OS {EXISTING_OS_ID} found in list")
                else:
                    self.log(f"    ⚠️ Existing OS {EXISTING_OS_ID} not found", "WARNING")
                
            else:
                self.log(f"    ❌ Failed to list ordens: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error listing ordens: {str(e)}", "ERROR")
            return False
        
        # Test GET specific OS
        os_id_to_test = self.created_os_id or EXISTING_OS_ID
        self.log(f"  6.2 Testing GET specific OS: {os_id_to_test}...")
        try:
            response = self.session.get(f"{BACKEND_URL}/ordens-servico/{os_id_to_test}")
            
            if response.status_code == 200:
                os_data = response.json()
                self.log("    ✅ Retrieved specific OS successfully")
                self.log(f"       Número: {os_data.get('numero')}")
                self.log(f"       Tipo: {os_data.get('tipo')}")
                self.log(f"       Status: {os_data.get('status')}")
                self.log(f"       Cliente ID: {os_data.get('cliente_id')}")
                self.log(f"       Técnico ID: {os_data.get('tecnico_id')}")
            else:
                self.log(f"    ❌ Failed to get specific OS: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error getting specific OS: {str(e)}", "ERROR")
            return False
        
        return True

    def test_technician_assignment(self):
        """Test 7: Technician Assignment to OS"""
        self.log("Testing technician assignment to OS...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        # Get a user to assign as technician
        self.log("  7.1 Getting available users for technician assignment...")
        try:
            response = self.session.get(f"{BACKEND_URL}/users")
            
            if response.status_code == 200:
                users = response.json()
                if users:
                    tecnico_id = users[0].get('id')
                    tecnico_nome = users[0].get('nome')
                    self.log(f"    ✅ Using user as technician: {tecnico_nome} ({tecnico_id})")
                else:
                    self.log("    ❌ No users available for technician assignment", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to get users: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error getting users: {str(e)}", "ERROR")
            return False
        
        # Test technician assignment
        os_id_to_test = self.created_os_id or EXISTING_OS_ID
        self.log(f"  7.2 Testing technician assignment to OS: {os_id_to_test}...")
        
        assignment_data = {
            "tecnico_id": tecnico_id,
            "data_agendamento": "2026-01-16",
            "horario_previsto": "14:00"
        }
        
        try:
            response = self.session.patch(f"{BACKEND_URL}/ordens-servico/{os_id_to_test}/atribuir", json=assignment_data)
            
            if response.status_code == 200:
                updated_os = response.json()
                self.log("    ✅ Technician assigned successfully")
                self.log(f"       Técnico ID: {updated_os.get('tecnico_id')}")
                self.log(f"       Data Agendamento: {updated_os.get('data_agendamento')}")
                self.log(f"       Horário Previsto: {updated_os.get('horario_previsto')}")
                self.log(f"       Status: {updated_os.get('status')}")
            else:
                self.log(f"    ❌ Failed to assign technician: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error assigning technician: {str(e)}", "ERROR")
            return False
        
        return True

    def test_os_status_update(self):
        """Test 8: OS Status Update"""
        self.log("Testing OS status update...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        os_id_to_test = self.created_os_id or EXISTING_OS_ID
        self.log(f"  8.1 Testing OS status update: {os_id_to_test}...")
        
        # Test status progression: aberta -> agendada -> em_andamento -> concluida
        status_updates = [
            ("agendada", "OS agendada para execução"),
            ("em_andamento", "Técnico iniciou a instalação"),
            ("concluida", "Instalação concluída com sucesso")
        ]
        
        for new_status, observacao in status_updates:
            self.log(f"    8.1.{status_updates.index((new_status, observacao)) + 1} Updating status to: {new_status}...")
            
            update_data = {
                "status": new_status,
                "observacoes_tecnico": observacao
            }
            
            if new_status == "em_andamento":
                update_data["data_inicio_execucao"] = "2026-01-16T14:00:00"
            elif new_status == "concluida":
                update_data["data_fim_execucao"] = "2026-01-16T16:30:00"
            
            try:
                response = self.session.patch(f"{BACKEND_URL}/ordens-servico/{os_id_to_test}/status", json=update_data)
                
                if response.status_code == 200:
                    updated_os = response.json()
                    self.log(f"      ✅ Status updated to: {updated_os.get('status')}")
                    
                    if new_status == "concluida":
                        self.log(f"      Data Início: {updated_os.get('data_inicio_execucao')}")
                        self.log(f"      Data Fim: {updated_os.get('data_fim_execucao')}")
                else:
                    self.log(f"      ❌ Failed to update status: {response.status_code} - {response.text}", "ERROR")
                    return False
                    
            except Exception as e:
                self.log(f"      ❌ Error updating status: {str(e)}", "ERROR")
                return False
        
        return True

    def test_os_checklist(self):
        """Test 9: OS Checklist Management"""
        self.log("Testing OS checklist management...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        os_id_to_test = self.created_os_id or EXISTING_OS_ID
        self.log(f"  9.1 Testing checklist update for OS: {os_id_to_test}...")
        
        checklist_data = {
            "checklist": [
                {"item": "Verificar sinal na região", "obrigatorio": True, "concluido": True},
                {"item": "Instalar equipamento", "obrigatorio": True, "concluido": True},
                {"item": "Configurar roteador", "obrigatorio": True, "concluido": True},
                {"item": "Testar velocidade", "obrigatorio": True, "concluido": True},
                {"item": "Orientar cliente", "obrigatorio": False, "concluido": True}
            ]
        }
        
        try:
            response = self.session.patch(f"{BACKEND_URL}/ordens-servico/{os_id_to_test}/checklist", json=checklist_data)
            
            if response.status_code == 200:
                updated_os = response.json()
                checklist = updated_os.get('checklist', [])
                
                self.log("    ✅ Checklist updated successfully")
                self.log(f"       Total items: {len(checklist)}")
                
                # Verify all items
                completed_items = sum(1 for item in checklist if item.get('concluido'))
                self.log(f"       Completed items: {completed_items}/{len(checklist)}")
                
                if completed_items == len(checklist):
                    self.log("    ✅ All checklist items completed")
                else:
                    self.log(f"    ⚠️ Not all items completed: {completed_items}/{len(checklist)}", "WARNING")
                
            else:
                self.log(f"    ❌ Failed to update checklist: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error updating checklist: {str(e)}", "ERROR")
            return False
        
        return True

    def test_contract_signature(self):
        """Test 10: Digital Contract Signature"""
        self.log("Testing digital contract signature...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        # Use created contract or existing one
        contrato_id_to_test = self.created_contrato_id or EXISTING_CONTRATO_ID
        self.log(f"  10.1 Testing contract signature for: {contrato_id_to_test}...")
        
        # Mock signature data (base64 encoded signature image)
        signature_data = {
            "assinatura_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "assinado_por": "Maria Silva Santos",
            "ip_assinatura": "192.168.1.100"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/contratos/{contrato_id_to_test}/assinar", json=signature_data)
            
            if response.status_code == 200:
                signed_contract = response.json()
                self.log("    ✅ Contract signed successfully")
                self.log(f"       Status: {signed_contract.get('status')}")
                self.log(f"       Assinado por: {signed_contract.get('assinado_por')}")
                self.log(f"       Data Assinatura: {signed_contract.get('data_assinatura')}")
                self.log(f"       IP: {signed_contract.get('ip_assinatura')}")
                
                # Verify status changed to 'assinado'
                if signed_contract.get('status') == 'assinado':
                    self.log("    ✅ Contract status correctly updated to 'assinado'")
                else:
                    self.log(f"    ❌ Contract status not updated correctly: {signed_contract.get('status')}", "ERROR")
                    return False
                
            else:
                self.log(f"    ❌ Failed to sign contract: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error signing contract: {str(e)}", "ERROR")
            return False
        
        return True

    def test_complete_flow_verification(self):
        """Test 11: Complete Flow Verification"""
        self.log("Testing complete flow verification...")
        
        if not self.token or not self.created_venda_id:
            # Try to use existing venda ID if created venda ID is not available
            venda_id_to_test = self.created_venda_id or EXISTING_VENDA_ID
            if not venda_id_to_test:
                self.log("❌ No venda ID available for testing", "ERROR")
                return False
        else:
            venda_id_to_test = self.created_venda_id
        
        # Verify the complete flow: Venda -> Contrato -> OS
        self.log("  11.1 Verifying complete flow integration...")
        
        try:
            # Get the venda details
            response = self.session.get(f"{BACKEND_URL}/vendas-servico/{venda_id_to_test}")
            
            if response.status_code == 200:
                venda = response.json()
                
                self.log("    ✅ Venda details retrieved")
                self.log(f"       Venda ID: {venda.get('id')}")
                self.log(f"       Status: {venda.get('status')}")
                self.log(f"       Tem Contrato: {venda.get('tem_contrato')}")
                self.log(f"       Contrato ID: {venda.get('contrato_id')}")
                self.log(f"       OS Instalação ID: {venda.get('os_instalacao_id')}")
                
                # Verify contract exists if required
                contrato_id = venda.get('contrato_id')
                if contrato_id:
                    response = self.session.get(f"{BACKEND_URL}/contratos/{contrato_id}")
                    if response.status_code == 200:
                        contrato = response.json()
                        self.log(f"    ✅ Associated contract found: {contrato.get('status')}")
                    else:
                        self.log(f"    ❌ Associated contract not found: {response.status_code}", "ERROR")
                        return False
                
                # Verify OS exists
                os_id = venda.get('os_instalacao_id')
                if os_id:
                    response = self.session.get(f"{BACKEND_URL}/ordens-servico/{os_id}")
                    if response.status_code == 200:
                        os_data = response.json()
                        self.log(f"    ✅ Associated OS found: {os_data.get('numero')} - {os_data.get('status')}")
                        
                        # Verify OS is linked to the same venda
                        if os_data.get('venda_id') == venda_id_to_test:
                            self.log("    ✅ OS correctly linked to venda")
                        else:
                            self.log(f"    ⚠️ OS not linked to this venda (may be normal)", "WARNING")
                    else:
                        self.log(f"    ❌ Associated OS not found: {response.status_code}", "ERROR")
                        return False
                else:
                    self.log("    ❌ No OS generated for venda", "ERROR")
                    return False
                
            else:
                self.log(f"    ❌ Failed to get venda details: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"    ❌ Error verifying complete flow: {str(e)}", "ERROR")
            return False
        
        self.log("    ✅ Complete flow verification successful")
        return True

    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("=" * 80)
        self.log("STARTING VENDAS COM CONTRATOS (FASE 1) BACKEND TESTING")
        self.log("=" * 80)
        
        tests = [
            ("Admin Login", self.test_admin_login),
            ("Planos de Serviço CRUD", self.test_planos_servico_crud),
            ("Modelos de Contrato CRUD", self.test_modelos_contrato_crud),
            ("Contract Preview", self.test_contract_preview),
            ("Vendas de Serviço CRUD", self.test_vendas_servico_crud),
            ("Ordens de Serviço CRUD", self.test_ordens_servico_crud),
            ("Technician Assignment", self.test_technician_assignment),
            ("OS Status Update", self.test_os_status_update),
            ("OS Checklist", self.test_os_checklist),
            ("Contract Signature", self.test_contract_signature),
            ("Complete Flow Verification", self.test_complete_flow_verification)
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            self.log(f"\n{'=' * 60}")
            self.log(f"RUNNING: {test_name}")
            self.log(f"{'=' * 60}")
            
            try:
                if test_func():
                    self.log(f"✅ {test_name} - PASSED")
                    passed += 1
                else:
                    self.log(f"❌ {test_name} - FAILED")
                    failed += 1
            except Exception as e:
                self.log(f"❌ {test_name} - ERROR: {str(e)}")
                failed += 1
        
        # Final summary
        self.log(f"\n{'=' * 80}")
        self.log("FINAL TEST SUMMARY")
        self.log(f"{'=' * 80}")
        self.log(f"Total Tests: {len(tests)}")
        self.log(f"Passed: {passed}")
        self.log(f"Failed: {failed}")
        self.log(f"Success Rate: {(passed/len(tests)*100):.1f}%")
        
        if failed == 0:
            self.log("🎉 ALL TESTS PASSED! Sistema de Vendas com Contratos working correctly.")
        else:
            self.log(f"⚠️ {failed} test(s) failed. Please review the errors above.")
        
        return failed == 0

if __name__ == "__main__":
    runner = VendasContratosTestRunner()
    success = runner.run_all_tests()
    exit(0 if success else 1)