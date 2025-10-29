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