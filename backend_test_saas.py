#!/usr/bin/env python3
"""
Backend API Testing for ECHO SHOP FinAI - SaaS Subscription System Testing
Tests complete SaaS subscription system including:
- Plans listing
- Subscription creation with automatic company and user creation
- PIX payment generation
- Payment verification
- Company and user verification
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
EMPRESA_ID = None  # Will be determined from user data

class SaaSTestRunner:
    def __init__(self):
        self.token = None
        self.user_data = None
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
        # Test data storage - SaaS Subscription
        self.created_subscription_id = None
        self.created_empresa_id = None
        self.created_user_id = None
        self.pix_qrcode = None
        self.pix_codigo = None
        self.test_email = None
        
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
                    
                    # Set EMPRESA_ID from user data for subsequent tests
                    empresa_ids = self.user_data.get('empresa_ids', [])
                    if empresa_ids:
                        global EMPRESA_ID
                        EMPRESA_ID = empresa_ids[0]
                        self.log(f"   ✅ Using empresa_id: {EMPRESA_ID}")
                    
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

    def test_planos_saas(self):
        """Test 2: GET /api/assinaturas/planos - List available plans"""
        self.log("Testing SaaS plans listing...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        try:
            response = self.session.get(f"{BACKEND_URL}/assinaturas/planos")
            
            if response.status_code == 200:
                planos = response.json()
                self.log("✅ Plans retrieved successfully")
                self.log(f"   Number of plans: {len(planos)}")
                
                # Verify expected plans exist
                expected_plans = {"basico": 99.00, "profissional": 199.00}
                
                for plano_key, expected_value in expected_plans.items():
                    if plano_key in planos:
                        plano_data = planos[plano_key]
                        valor = plano_data.get("valor")
                        nome = plano_data.get("nome")
                        
                        self.log(f"   ✅ Plan '{plano_key}' found:")
                        self.log(f"      Nome: {nome}")
                        self.log(f"      Valor: R$ {valor}")
                        
                        if valor == expected_value:
                            self.log(f"      ✅ Correct value: R$ {valor}")
                        else:
                            self.log(f"      ❌ Incorrect value: expected R$ {expected_value}, got R$ {valor}", "ERROR")
                            return False
                    else:
                        self.log(f"   ❌ Plan '{plano_key}' not found", "ERROR")
                        return False
                
                return True
            else:
                self.log(f"❌ Failed to retrieve plans: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error retrieving plans: {str(e)}", "ERROR")
            return False

    def test_create_subscription(self):
        """Test 3: POST /api/assinaturas - Create new subscription"""
        self.log("Testing subscription creation...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        # Test data from review request - using valid CNPJ format and unique email/CNPJ
        unique_id = str(uuid.uuid4())[:8]
        self.test_email = f"teste.empresa.{unique_id}@teste.com"
        # Generate unique CNPJ by changing the last digits
        unique_cnpj = f"1122233300{unique_id[:4].zfill(4)}"
        subscription_data = {
            "razao_social": "Empresa Teste LTDA",
            "cnpj_cpf": unique_cnpj,
            "email": self.test_email,
            "telefone": "11999998888",
            "plano": "basico"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/assinaturas", json=subscription_data)
            
            if response.status_code == 200:
                created_subscription = response.json()
                self.log("✅ Subscription created successfully")
                self.log(f"   Full response: {created_subscription}")
                
                # The response format is different - it's a message with details
                self.created_subscription_id = created_subscription.get('assinatura_id')
                
                self.log(f"   Subscription ID: {self.created_subscription_id}")
                self.log(f"   Empresa ID: {created_subscription.get('empresa_id')}")
                self.log(f"   User Email: {created_subscription.get('user_email')}")
                self.log(f"   Plano: {created_subscription.get('plano')}")
                self.log(f"   Valor: R$ {created_subscription.get('valor')}")
                
                # Verify PIX data was generated
                self.pix_qrcode = created_subscription.get('pix_qrcode')
                self.pix_codigo = created_subscription.get('pix_codigo')
                
                if self.pix_qrcode:
                    self.log(f"   ✅ PIX QR Code generated: {self.pix_qrcode[:50]}...")
                else:
                    self.log("   ❌ PIX QR Code not generated", "ERROR")
                    return False
                
                if self.pix_codigo:
                    self.log(f"   ✅ PIX Code generated: {self.pix_codigo[:50]}...")
                else:
                    self.log("   ❌ PIX Code not generated", "ERROR")
                    return False
                
                # Store user and empresa IDs for verification
                self.created_user_id = created_subscription.get('user_id')
                self.created_empresa_id = created_subscription.get('empresa_id')
                
                return True
            else:
                self.log(f"❌ Failed to create subscription: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error creating subscription: {str(e)}", "ERROR")
            return False

    def test_list_subscriptions(self):
        """Test 4: GET /api/assinaturas - List subscriptions"""
        self.log("Testing subscription listing...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        try:
            response = self.session.get(f"{BACKEND_URL}/assinaturas")
            
            if response.status_code == 200:
                subscriptions = response.json()
                self.log(f"✅ Retrieved {len(subscriptions)} subscriptions")
                
                # Find our created subscription
                found_subscription = None
                for sub in subscriptions:
                    if sub.get('id') == self.created_subscription_id:
                        found_subscription = sub
                        break
                
                if found_subscription:
                    self.log("✅ Created subscription found in list")
                    self.log(f"   Razão Social: {found_subscription.get('razao_social')}")
                    self.log(f"   Status: {found_subscription.get('status')}")
                    
                    # Verify status is "aguardando_pagamento"
                    status = found_subscription.get('status')
                    if status == "aguardando_pagamento":
                        self.log("   ✅ Correct status: aguardando_pagamento")
                    else:
                        self.log(f"   ❌ Incorrect status: expected 'aguardando_pagamento', got '{status}'", "ERROR")
                        return False
                else:
                    self.log("   ❌ Created subscription NOT found in list", "ERROR")
                    return False
                
                return True
            else:
                self.log(f"❌ Failed to list subscriptions: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error listing subscriptions: {str(e)}", "ERROR")
            return False

    def test_verify_payment(self):
        """Test 5: POST /api/assinaturas/{id}/verificar-pagamento - Verify payment status"""
        self.log("Testing payment verification...")
        
        if not self.token or not self.created_subscription_id:
            self.log("❌ No auth token or subscription ID available", "ERROR")
            return False
        
        try:
            response = self.session.post(f"{BACKEND_URL}/assinaturas/{self.created_subscription_id}/verificar-pagamento")
            
            if response.status_code == 200:
                payment_status = response.json()
                self.log("✅ Payment verification successful")
                self.log(f"   Payment Status: {payment_status}")
                
                # Since this is sandbox/mock, expect PENDING or similar
                status = payment_status.get('status', payment_status)
                if status in ['PENDING', 'pending', 'AGUARDANDO', 'aguardando']:
                    self.log(f"   ✅ Expected payment status (sandbox): {status}")
                else:
                    self.log(f"   ⚠️ Unexpected payment status: {status} (may be normal for sandbox)")
                
                return True
            else:
                self.log(f"❌ Failed to verify payment: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error verifying payment: {str(e)}", "ERROR")
            return False

    def test_verify_empresa_created(self):
        """Test 6: GET /api/empresas - Verify empresa was created"""
        self.log("Testing empresa creation verification...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas")
            
            if response.status_code == 200:
                empresas = response.json()
                self.log(f"✅ Retrieved {len(empresas)} empresas")
                
                # Find the created empresa by ID (we have it from subscription creation)
                found_empresa = None
                for empresa in empresas:
                    if empresa.get('id') == self.created_empresa_id:
                        found_empresa = empresa
                        break
                
                if found_empresa:
                    self.log("✅ Created empresa found")
                    self.log(f"   Empresa ID: {self.created_empresa_id}")
                    self.log(f"   Razão Social: {found_empresa.get('razao_social')}")
                    self.log(f"   CNPJ: {found_empresa.get('cnpj')}")
                else:
                    self.log(f"   ❌ Created empresa with ID '{self.created_empresa_id}' NOT found", "ERROR")
                    self.log("   Available empresas:")
                    for empresa in empresas:
                        self.log(f"     - {empresa.get('razao_social')} (ID: {empresa.get('id')})")
                    return False
                
                return True
            else:
                self.log(f"❌ Failed to list empresas: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error listing empresas: {str(e)}", "ERROR")
            return False

    def test_verify_user_created(self):
        """Test 7: GET /api/users - Verify user was created"""
        self.log("Testing user creation verification...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        try:
            response = self.session.get(f"{BACKEND_URL}/users")
            
            if response.status_code == 200:
                users = response.json()
                self.log(f"✅ Retrieved {len(users)} users")
                
                # Find the created user with the test email
                found_user = None
                for user in users:
                    if user.get('email') == self.test_email:
                        found_user = user
                        break
                
                if found_user:
                    self.log("✅ Created user found")
                    self.log(f"   User ID: {found_user.get('id')}")
                    self.log(f"   Email: {found_user.get('email')}")
                    self.log(f"   Nome: {found_user.get('nome')}")
                    self.log(f"   Perfil: {found_user.get('perfil')}")
                    
                    # Verify user is associated with the created empresa
                    user_empresa_ids = found_user.get('empresa_ids', [])
                    if self.created_empresa_id in user_empresa_ids:
                        self.log(f"   ✅ User correctly associated with empresa {self.created_empresa_id}")
                    else:
                        self.log(f"   ❌ User not associated with created empresa", "ERROR")
                        return False
                else:
                    self.log(f"   ❌ Created user '{self.test_email}' NOT found", "ERROR")
                    return False
                
                return True
            else:
                self.log(f"❌ Failed to list users: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error listing users: {str(e)}", "ERROR")
            return False

    def run_saas_tests(self):
        """Run SaaS subscription system tests"""
        self.log("=" * 80)
        self.log("STARTING ECHO SHOP FinAI - SAAS SUBSCRIPTION SYSTEM TESTS")
        self.log("=" * 80)
        
        results = {
            'login': False,
            'planos_saas': False,
            'create_subscription': False,
            'list_subscriptions': False,
            'verify_payment': False,
            'verify_empresa_created': False,
            'verify_user_created': False
        }
        
        # Test 1: Admin Login
        results['login'] = self.test_admin_login()
        
        if not results['login']:
            self.log("❌ Cannot continue without successful login", "ERROR")
            return results
        
        # SAAS SUBSCRIPTION TESTS
        self.log("\n" + "=" * 60)
        self.log("SAAS SUBSCRIPTION SYSTEM TESTS")
        self.log("=" * 60)
        
        # Test 2: List SaaS Plans
        results['planos_saas'] = self.test_planos_saas()
        
        # Test 3: Create Subscription
        results['create_subscription'] = self.test_create_subscription()
        
        # Test 4: List Subscriptions
        results['list_subscriptions'] = self.test_list_subscriptions()
        
        # Test 5: Verify Payment Status
        results['verify_payment'] = self.test_verify_payment()
        
        # Test 6: Verify Empresa Created
        results['verify_empresa_created'] = self.test_verify_empresa_created()
        
        # Test 7: Verify User Created
        results['verify_user_created'] = self.test_verify_user_created()
        
        # Summary
        self.log("\n" + "=" * 80)
        self.log("TEST RESULTS SUMMARY")
        self.log("=" * 80)
        
        # SaaS tests
        self.log("\nSAAS SUBSCRIPTION SYSTEM TESTS:")
        saas_tests = ['planos_saas', 'create_subscription', 'list_subscriptions', 'verify_payment', 
                     'verify_empresa_created', 'verify_user_created']
        
        for test_name in saas_tests:
            status = "✅ PASS" if results[test_name] else "❌ FAIL"
            self.log(f"  {test_name.replace('_', ' ').title()}: {status}")
        
        # Overall summary
        self.log(f"\nLOGIN TEST:")
        status = "✅ PASS" if results['login'] else "❌ FAIL"
        self.log(f"  Login: {status}")
        
        total_tests = len(results)
        passed_tests = sum(results.values())
        
        self.log(f"\nOverall: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            self.log("🎉 ALL TESTS PASSED - SaaS Subscription System working correctly!")
        else:
            failed_tests = [name for name, passed in results.items() if not passed]
            self.log(f"⚠️ SOME TESTS FAILED: {', '.join(failed_tests)}")
        
        return results

if __name__ == "__main__":
    tester = SaaSTestRunner()
    results = tester.run_saas_tests()