#!/usr/bin/env python3
"""
Backend API Testing for ECHO SHOP FinAI - Investments and Credit Cards CRUD Operations
Tests complete CRUD operations for Investimentos and Cartões de Crédito with transaction integration
"""

import requests
import json
import os
from datetime import datetime
import uuid

# Configuration
BACKEND_URL = "https://fintracker-117.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@echoshop.com.br"
ADMIN_PASSWORD = "Admin@2024"
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
        
        # Test data storage
        self.created_investment_id = None
        self.created_card_id = None
        self.created_account_id = None
        
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
    
    def test_whatsapp_processing(self):
        """Test 3: Test WhatsApp Message Processing (without auth - internal endpoint)"""
        self.log("Testing WhatsApp message processing...")
        
        test_message = {
            "phone_number": "5511999999999",
            "sender_name": "Test User",
            "message": "Paguei R$ 200,00 para Padaria do Zé"
        }
        
        try:
            # Remove auth header for internal endpoint
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            response = requests.post(f"{BACKEND_URL}/whatsapp/process", 
                                   json=test_message, 
                                   headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.log("✅ WhatsApp message processed successfully")
                
                # Check response structure
                if 'dados_extraidos' in data:
                    dados = data['dados_extraidos']
                    self.log(f"   Extracted data: {json.dumps(dados, indent=2)}")
                    
                    # Verify key fields
                    if dados.get('valor_total'):
                        self.log(f"   ✅ Value extracted: R$ {dados['valor_total']}")
                    else:
                        self.log("   ❌ No value extracted", "ERROR")
                        
                    if dados.get('fornecedor'):
                        self.log(f"   ✅ Supplier extracted: {dados['fornecedor']}")
                    else:
                        self.log("   ❌ No supplier extracted", "ERROR")
                else:
                    self.log("   ❌ No 'dados_extraidos' in response", "ERROR")
                
                if 'response_message' in data:
                    self.log(f"   Response message: {data['response_message']}")
                else:
                    self.log("   ❌ No response message", "ERROR")
                
                return data
            else:
                self.log(f"❌ WhatsApp processing failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error processing WhatsApp message: {str(e)}", "ERROR")
            return False
    
    def test_new_transaction_assignment(self, initial_count):
        """Test 4: Verify New Transaction Assignment"""
        self.log("Verifying new transaction assignment...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
            
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/transacoes")
            
            if response.status_code == 200:
                transactions = response.json()
                new_count = len(transactions)
                
                self.log(f"   Transaction count before: {initial_count}")
                self.log(f"   Transaction count after: {new_count}")
                
                if new_count > initial_count:
                    self.log(f"✅ New transaction(s) created: {new_count - initial_count}")
                    
                    # Find the newest transaction
                    newest_transaction = max(transactions, key=lambda x: x.get('created_at', ''))
                    
                    self.log(f"   Newest transaction ID: {newest_transaction.get('id')}")
                    self.log(f"   Empresa ID: {newest_transaction.get('empresa_id')}")
                    self.log(f"   Supplier: {newest_transaction.get('fornecedor')}")
                    self.log(f"   Value: R$ {newest_transaction.get('valor_total')}")
                    self.log(f"   Origin: {newest_transaction.get('origem')}")
                    
                    # Verify empresa_id is correct
                    if newest_transaction.get('empresa_id') == EMPRESA_ID:
                        self.log("   ✅ New transaction has correct empresa_id")
                        return True
                    else:
                        self.log(f"   ❌ New transaction has wrong empresa_id: {newest_transaction.get('empresa_id')}", "ERROR")
                        return False
                else:
                    self.log("   ⚠️ No new transactions created")
                    return False
                    
            else:
                self.log(f"❌ Failed to get updated transactions: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error verifying new transaction: {str(e)}", "ERROR")
            return False
    
    def run_all_tests(self):
        """Run all test scenarios"""
        self.log("=" * 60)
        self.log("STARTING WHATSAPP COMPANY ID ASSIGNMENT TESTS")
        self.log("=" * 60)
        
        results = {
            'login': False,
            'existing_transactions': False,
            'whatsapp_processing': False,
            'new_transaction_assignment': False
        }
        
        # Test 1: Admin Login
        results['login'] = self.test_admin_login()
        
        if not results['login']:
            self.log("❌ Cannot continue without successful login", "ERROR")
            return results
        
        # Test 2: Existing Transactions
        transaction_result = self.test_existing_transactions()
        if transaction_result:
            results['existing_transactions'] = True
            initial_count, whatsapp_txns = transaction_result
        else:
            initial_count = 0
        
        # Test 3: WhatsApp Processing
        processing_result = self.test_whatsapp_processing()
        if processing_result:
            results['whatsapp_processing'] = True
        
        # Test 4: New Transaction Assignment
        if results['whatsapp_processing']:
            results['new_transaction_assignment'] = self.test_new_transaction_assignment(initial_count)
        
        # Summary
        self.log("=" * 60)
        self.log("TEST RESULTS SUMMARY")
        self.log("=" * 60)
        
        for test_name, passed in results.items():
            status = "✅ PASS" if passed else "❌ FAIL"
            self.log(f"{test_name.replace('_', ' ').title()}: {status}")
        
        total_tests = len(results)
        passed_tests = sum(results.values())
        
        self.log(f"\nOverall: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            self.log("🎉 ALL TESTS PASSED - WhatsApp company ID assignment is working correctly!")
        else:
            self.log("⚠️ SOME TESTS FAILED - Issues detected with WhatsApp company ID assignment")
        
        return results

if __name__ == "__main__":
    tester = WhatsAppTestRunner()
    results = tester.run_all_tests()