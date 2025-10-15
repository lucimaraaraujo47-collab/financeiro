#!/usr/bin/env python3
"""
Backend API Testing for WhatsApp Message Processing - Company ID Assignment Fix
Tests the critical bug fix where WhatsApp transactions were assigned to wrong company
"""

import requests
import json
import os
from datetime import datetime

# Configuration
BACKEND_URL = "https://echo-finance.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@echoshop.com"
ADMIN_PASSWORD = "admin123"
EMPRESA_ID = "226b58c1-4a48-4b66-9537-0dbf9fa65500"

class WhatsAppTestRunner:
    def __init__(self):
        self.token = None
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def test_admin_login(self):
        """Test 1: Login as Admin"""
        self.log("Testing admin login...")
        
        login_data = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                if self.token:
                    self.session.headers.update({
                        'Authorization': f'Bearer {self.token}'
                    })
                    self.log("✅ Admin login successful")
                    self.log(f"   User ID: {data.get('user', {}).get('id')}")
                    self.log(f"   User Profile: {data.get('user', {}).get('perfil')}")
                    self.log(f"   Empresa IDs: {data.get('user', {}).get('empresa_ids')}")
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
    
    def test_existing_transactions(self):
        """Test 2: Verify Existing Transactions"""
        self.log("Testing existing transactions visibility...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
            
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/transacoes")
            
            if response.status_code == 200:
                transactions = response.json()
                self.log(f"✅ Retrieved {len(transactions)} transactions")
                
                # Look for the specific migrated WhatsApp transactions
                whatsapp_transactions = [t for t in transactions if t.get('origem') == 'whatsapp']
                self.log(f"   WhatsApp transactions found: {len(whatsapp_transactions)}")
                
                # Check for specific transaction IDs mentioned in the test
                trx_f0c35180 = None
                trx_09f9a544 = None
                
                for t in transactions:
                    if 'f0c35180' in t.get('id', ''):
                        trx_f0c35180 = t
                    elif '09f9a544' in t.get('id', ''):
                        trx_09f9a544 = t
                
                if trx_f0c35180:
                    self.log(f"   ✅ Found TRX-f0c35180: {trx_f0c35180.get('fornecedor')} - R$ {trx_f0c35180.get('valor_total')}")
                else:
                    self.log("   ⚠️ TRX-f0c35180 (luz) not found")
                    
                if trx_09f9a544:
                    self.log(f"   ✅ Found TRX-09f9a544: {trx_09f9a544.get('fornecedor')} - R$ {trx_09f9a544.get('valor_total')}")
                else:
                    self.log("   ⚠️ TRX-09f9a544 (internet) not found")
                
                # Verify all transactions belong to correct empresa
                wrong_empresa_count = 0
                for t in transactions:
                    if t.get('empresa_id') != EMPRESA_ID:
                        wrong_empresa_count += 1
                        self.log(f"   ❌ Transaction {t.get('id')} has wrong empresa_id: {t.get('empresa_id')}", "ERROR")
                
                if wrong_empresa_count == 0:
                    self.log("   ✅ All transactions have correct empresa_id")
                else:
                    self.log(f"   ❌ {wrong_empresa_count} transactions have wrong empresa_id", "ERROR")
                
                return len(transactions), whatsapp_transactions
                
            elif response.status_code == 403:
                self.log("❌ Access denied to empresa transactions", "ERROR")
                return False
            else:
                self.log(f"❌ Failed to get transactions: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error getting transactions: {str(e)}", "ERROR")
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