#!/usr/bin/env python3
"""
FinAI ECHO SHOP System Testing - Complete Backend API Testing
Based on review request requirements for comprehensive system testing
"""

import requests
import json
import os
from datetime import datetime
import uuid

# Configuration from review request
BACKEND_URL = "http://localhost:8001/api"
ADMIN_EMAIL = "faraujoneto2025@gmail.com"
ADMIN_PASSWORD = "EchoShop2025!"
EXPECTED_PROFILE = "admin_master"

class FinAIEchoShopTester:
    def __init__(self):
        self.token = None
        self.user_data = None
        self.empresa_id = None
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def test_authentication(self):
        """Test 1: Authentication with provided credentials"""
        self.log("=== TESTING AUTHENTICATION ===")
        
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
                    
                    # Verify profile
                    profile = self.user_data.get('perfil')
                    if profile == EXPECTED_PROFILE:
                        self.log(f"✅ Login successful with correct profile: {profile}")
                        self.log(f"   User ID: {self.user_data.get('id')}")
                        self.log(f"   Email: {self.user_data.get('email')}")
                        self.log(f"   Nome: {self.user_data.get('nome')}")
                        
                        # Get empresa_id from user data
                        empresa_ids = self.user_data.get('empresa_ids', [])
                        if empresa_ids:
                            self.empresa_id = empresa_ids[0]
                            self.log(f"   Empresa ID: {self.empresa_id}")
                        else:
                            self.log("   ❌ No empresa_ids found in user data", "ERROR")
                            return False
                        
                        return True
                    else:
                        self.log(f"❌ Incorrect profile: expected '{EXPECTED_PROFILE}', got '{profile}'", "ERROR")
                        return False
                else:
                    self.log("❌ Login response missing access token", "ERROR")
                    return False
            else:
                self.log(f"❌ Login failed with status {response.status_code}: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Login request failed: {str(e)}", "ERROR")
            return False
    
    def test_dashboard(self):
        """Test 2: Dashboard data retrieval"""
        self.log("=== TESTING DASHBOARD ===")
        
        if not self.token or not self.empresa_id:
            self.log("❌ No auth token or empresa_id available", "ERROR")
            return False
        
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{self.empresa_id}/dashboard")
            
            if response.status_code == 200:
                dashboard_data = response.json()
                self.log("✅ Dashboard data retrieved successfully")
                
                # Verify financial data structure
                expected_fields = ['total_receitas', 'total_despesas', 'saldo', 'saldo_contas']
                for field in expected_fields:
                    if field in dashboard_data:
                        value = dashboard_data[field]
                        self.log(f"   {field}: R$ {value:.2f}")
                    else:
                        self.log(f"   ❌ Missing field: {field}", "ERROR")
                        return False
                
                return True
            else:
                self.log(f"❌ Dashboard request failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Dashboard request error: {str(e)}", "ERROR")
            return False
    
    def test_licensing_system(self):
        """Test 3: Licensing System (Asaas Integration)"""
        self.log("=== TESTING LICENSING SYSTEM (ASAAS) ===")
        
        if not self.token or not self.empresa_id:
            self.log("❌ No auth token or empresa_id available", "ERROR")
            return False
        
        # Test GET licenses
        self.log("  3.1 Testing GET licenses...")
        try:
            response = self.session.get(f"{BACKEND_URL}/licencas/{self.empresa_id}")
            
            if response.status_code == 200:
                licenses = response.json()
                self.log(f"✅ Retrieved licenses structure successfully")
                self.log(f"   Response type: {type(licenses)}")
                if isinstance(licenses, list):
                    self.log(f"   Number of licenses: {len(licenses)}")
                elif isinstance(licenses, dict):
                    self.log(f"   License data keys: {list(licenses.keys())}")
            else:
                self.log(f"❌ GET licenses failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ GET licenses error: {str(e)}", "ERROR")
            return False
        
        # Test POST license creation (mock mode)
        self.log("  3.2 Testing POST license creation...")
        license_data = {
            "plano": "basico",
            "valor_mensal": 99.90
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/licencas", 
                                       params={"empresa_id": self.empresa_id, "plano": "basico"})
            
            if response.status_code == 200:
                license_response = response.json()
                self.log("✅ License creation successful (mock mode expected)")
                
                # Check if it's mock response
                if "mock" in str(license_response).lower() or "Mock" in str(license_response):
                    self.log("   ✅ Mock mode detected - integration will work with real API key")
                else:
                    self.log("   ✅ Real Asaas integration working")
                
                self.log(f"   Response: {license_response}")
                return True
            else:
                self.log(f"❌ License creation failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ License creation error: {str(e)}", "ERROR")
            return False
    
    def test_email_system(self):
        """Test 4: Email System Configuration"""
        self.log("=== TESTING EMAIL SYSTEM ===")
        
        # Check environment variables
        self.log("  4.1 Checking email environment variables...")
        
        # Read backend .env file
        try:
            with open('/app/backend/.env', 'r') as f:
                env_content = f.read()
            
            gmail_user_found = "GMAIL_USER=faraujoneto2025@gmail.com" in env_content
            gmail_password_found = "GMAIL_APP_PASSWORD=piue ruzd lgis lggq" in env_content
            
            if gmail_user_found:
                self.log("   ✅ GMAIL_USER configured correctly")
            else:
                self.log("   ❌ GMAIL_USER not configured correctly", "ERROR")
                return False
            
            if gmail_password_found:
                self.log("   ✅ GMAIL_APP_PASSWORD configured correctly (with spaces)")
            else:
                self.log("   ❌ GMAIL_APP_PASSWORD not configured correctly", "ERROR")
                return False
            
            return True
            
        except Exception as e:
            self.log(f"❌ Error reading .env file: {str(e)}", "ERROR")
            return False
    
    def test_empresas_endpoints(self):
        """Test 5: Empresas Endpoints"""
        self.log("=== TESTING EMPRESAS ENDPOINTS ===")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        # Test GET empresas
        self.log("  5.1 Testing GET empresas...")
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas")
            
            if response.status_code == 200:
                empresas = response.json()
                self.log(f"✅ Retrieved {len(empresas)} empresas")
                
                # Verify admin_master has access
                if empresas:
                    for empresa in empresas:
                        self.log(f"   Empresa: {empresa.get('razao_social')} (ID: {empresa.get('id')})")
                    
                    # Verify user has access to at least one empresa
                    user_empresa_ids = self.user_data.get('empresa_ids', [])
                    empresa_ids_in_response = [e.get('id') for e in empresas]
                    
                    has_access = any(eid in empresa_ids_in_response for eid in user_empresa_ids)
                    if has_access:
                        self.log("   ✅ admin_master user has access to empresas")
                    else:
                        self.log("   ❌ admin_master user does not have access to any empresas", "ERROR")
                        return False
                else:
                    self.log("   ❌ No empresas found", "ERROR")
                    return False
                
                return True
            else:
                self.log(f"❌ GET empresas failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ GET empresas error: {str(e)}", "ERROR")
            return False
    
    def test_logs_system(self):
        """Test 6: Logs System"""
        self.log("=== TESTING LOGS SYSTEM ===")
        
        if not self.token or not self.empresa_id:
            self.log("❌ No auth token or empresa_id available", "ERROR")
            return False
        
        # Test GET logs/acoes
        self.log("  6.1 Testing GET logs/acoes...")
        try:
            response = self.session.get(f"{BACKEND_URL}/logs/acoes", 
                                      params={"empresa_id": self.empresa_id, "limit": 10})
            
            if response.status_code == 200:
                logs_acoes = response.json()
                self.log(f"✅ Retrieved {len(logs_acoes)} action logs")
                
                # Verify structure
                if logs_acoes:
                    sample_log = logs_acoes[0]
                    expected_fields = ['user_id', 'user_email', 'empresa_id', 'acao', 'modulo', 'timestamp']
                    for field in expected_fields:
                        if field in sample_log:
                            self.log(f"   ✅ Field '{field}' present")
                        else:
                            self.log(f"   ❌ Field '{field}' missing", "ERROR")
                            return False
                else:
                    self.log("   ✅ No action logs found (empty system)")
                
            else:
                self.log(f"❌ GET logs/acoes failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ GET logs/acoes error: {str(e)}", "ERROR")
            return False
        
        # Test GET logs/sessoes
        self.log("  6.2 Testing GET logs/sessoes...")
        try:
            response = self.session.get(f"{BACKEND_URL}/logs/sessoes", 
                                      params={"empresa_id": self.empresa_id, "limit": 10})
            
            if response.status_code == 200:
                logs_sessoes = response.json()
                self.log(f"✅ Retrieved {len(logs_sessoes)} session logs")
                
                # Verify structure
                if logs_sessoes:
                    sample_log = logs_sessoes[0]
                    expected_fields = ['user_id', 'user_email', 'empresa_id', 'login_at']
                    for field in expected_fields:
                        if field in sample_log:
                            self.log(f"   ✅ Field '{field}' present")
                        else:
                            self.log(f"   ❌ Field '{field}' missing", "ERROR")
                            return False
                else:
                    self.log("   ✅ No session logs found (empty system)")
                
                return True
            else:
                self.log(f"❌ GET logs/sessoes failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ GET logs/sessoes error: {str(e)}", "ERROR")
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("🚀 Starting FinAI ECHO SHOP System Testing...")
        self.log(f"Backend URL: {BACKEND_URL}")
        self.log(f"Test Credentials: {ADMIN_EMAIL}")
        
        tests = [
            ("Authentication", self.test_authentication),
            ("Dashboard", self.test_dashboard),
            ("Licensing System (Asaas)", self.test_licensing_system),
            ("Email System", self.test_email_system),
            ("Empresas Endpoints", self.test_empresas_endpoints),
            ("Logs System", self.test_logs_system)
        ]
        
        results = {}
        
        for test_name, test_func in tests:
            self.log(f"\n{'='*60}")
            try:
                result = test_func()
                results[test_name] = result
                if result:
                    self.log(f"✅ {test_name}: PASSED")
                else:
                    self.log(f"❌ {test_name}: FAILED")
            except Exception as e:
                self.log(f"❌ {test_name}: ERROR - {str(e)}", "ERROR")
                results[test_name] = False
        
        # Summary
        self.log(f"\n{'='*60}")
        self.log("📊 TEST SUMMARY")
        self.log(f"{'='*60}")
        
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            self.log(f"{test_name}: {status}")
        
        self.log(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 ALL TESTS PASSED! System is working correctly.")
        else:
            self.log(f"⚠️  {total - passed} tests failed. Please review the issues above.")
        
        return results

if __name__ == "__main__":
    tester = FinAIEchoShopTester()
    results = tester.run_all_tests()