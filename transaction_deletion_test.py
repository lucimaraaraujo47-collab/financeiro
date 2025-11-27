#!/usr/bin/env python3
"""
Transaction Deletion with Balance Recalculation Test for FinTracker
Tests the critical bug fix for balance recalculation on transaction deletion
"""

import requests
import json
import os
from datetime import datetime
import uuid

# Configuration
BACKEND_URL = "https://echo-finances.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@echoshop.com"
ADMIN_PASSWORD = "admin123"

class TransactionDeletionTestRunner:
    def __init__(self):
        self.token = None
        self.user_data = None
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
    
    def test_transaction_deletion_balance_recalculation(self):
        """Test Transaction Deletion with Balance Recalculation Fix"""
        self.log("Testing Transaction Deletion with Balance Recalculation...")
        
        if not self.token:
            self.log("❌ No auth token available", "ERROR")
            return False
        
        # Step 1: Get empresa_id from user data
        empresa_ids = self.user_data.get('empresa_ids', [])
        if not empresa_ids:
            self.log("❌ No empresa_ids found in user data", "ERROR")
            return False
        
        empresa_id = empresa_ids[0]  # Use first empresa
        self.log(f"  1. Using empresa_id: {empresa_id}")
        
        # Step 2: Get initial dashboard state
        self.log("  2. Getting initial dashboard state...")
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{empresa_id}/dashboard")
            if response.status_code == 200:
                initial_dashboard = response.json()
                initial_receitas = initial_dashboard.get('total_receitas', 0)
                initial_despesas = initial_dashboard.get('total_despesas', 0)
                initial_saldo = initial_dashboard.get('saldo', 0)
                initial_saldo_contas = initial_dashboard.get('saldo_contas', 0)
                
                self.log(f"     Initial Dashboard - Receitas: R$ {initial_receitas}")
                self.log(f"     Initial Dashboard - Despesas: R$ {initial_despesas}")
                self.log(f"     Initial Dashboard - Saldo: R$ {initial_saldo}")
                self.log(f"     Initial Dashboard - Saldo em Contas: R$ {initial_saldo_contas}")
            else:
                self.log(f"    ❌ Failed to get dashboard: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"    ❌ Error getting dashboard: {str(e)}", "ERROR")
            return False
        
        # Step 3: Get bank accounts and their initial balances
        self.log("  3. Getting bank accounts...")
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{empresa_id}/contas")
            if response.status_code == 200:
                contas = response.json()
                if not contas:
                    self.log("    ❌ No bank accounts found", "ERROR")
                    return False
                
                # Use first available account
                conta_id = contas[0].get('id')
                initial_saldo_conta = contas[0].get('saldo_atual', 0)
                self.log(f"     Using account: {conta_id}")
                self.log(f"     Initial account balance: R$ {initial_saldo_conta}")
            else:
                self.log(f"    ❌ Failed to get bank accounts: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"    ❌ Error getting bank accounts: {str(e)}", "ERROR")
            return False
        
        # Step 4: Get categories for transaction creation
        self.log("  4. Getting categories...")
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{empresa_id}/categorias")
            if response.status_code == 200:
                categorias = response.json()
                if categorias:
                    categoria_id = categorias[0].get('id')
                    self.log(f"     Using category: {categoria_id}")
                else:
                    self.log("    ❌ No categories found", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to get categories: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"    ❌ Error getting categories: {str(e)}", "ERROR")
            return False
        
        # Step 4b: Get cost centers for transaction creation
        self.log("  4b. Getting cost centers...")
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{empresa_id}/centros-custo")
            if response.status_code == 200:
                centros_custo = response.json()
                if centros_custo:
                    centro_custo_id = centros_custo[0].get('id')
                    self.log(f"     Using cost center: {centro_custo_id}")
                else:
                    self.log("    ❌ No cost centers found", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to get cost centers: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"    ❌ Error getting cost centers: {str(e)}", "ERROR")
            return False
        
        # Step 5: Create test RECEITA transaction
        self.log("  5. Creating test RECEITA transaction (R$ 500)...")
        
        receita_data = {
            "tipo": "receita",
            "fornecedor": "Cliente Teste",
            "descricao": "Teste Receita para Deletar",
            "valor_total": 500.00,
            "data_competencia": "2025-01-31",
            "categoria_id": categoria_id,
            "centro_custo_id": centro_custo_id,
            "conta_bancaria_id": conta_id
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{empresa_id}/transacoes", json=receita_data)
            if response.status_code == 200:
                created_receita = response.json()
                receita_transacao_id = created_receita.get('id')
                self.log(f"     ✅ Receita transaction created: {receita_transacao_id}")
                self.log(f"     Transaction value: R$ {created_receita.get('valor_total')}")
            else:
                self.log(f"    ❌ Failed to create receita transaction: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"    ❌ Error creating receita transaction: {str(e)}", "ERROR")
            return False
        
        # Step 6: Verify balance increased
        self.log("  6. Verifying balance increased after receita...")
        
        # Check account balance
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{empresa_id}/contas")
            if response.status_code == 200:
                contas = response.json()
                updated_conta = next((c for c in contas if c.get('id') == conta_id), None)
                if updated_conta:
                    new_saldo_conta = updated_conta.get('saldo_atual', 0)
                    expected_saldo = initial_saldo_conta + 500.0
                    
                    if abs(new_saldo_conta - expected_saldo) < 0.01:
                        self.log(f"     ✅ Account balance increased correctly: R$ {initial_saldo_conta} → R$ {new_saldo_conta}")
                    else:
                        self.log(f"     ❌ Account balance not increased correctly: expected R$ {expected_saldo}, got R$ {new_saldo_conta}", "ERROR")
                        return False
                else:
                    self.log("     ❌ Account not found after transaction", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to get updated accounts: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"    ❌ Error checking account balance: {str(e)}", "ERROR")
            return False
        
        # Check dashboard totals
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{empresa_id}/dashboard")
            if response.status_code == 200:
                updated_dashboard = response.json()
                new_receitas = updated_dashboard.get('total_receitas', 0)
                new_saldo = updated_dashboard.get('saldo', 0)
                
                expected_receitas = initial_receitas + 500.0
                expected_saldo = initial_saldo + 500.0
                
                if abs(new_receitas - expected_receitas) < 0.01:
                    self.log(f"     ✅ Dashboard receitas increased correctly: R$ {initial_receitas} → R$ {new_receitas}")
                else:
                    self.log(f"     ❌ Dashboard receitas not increased correctly: expected R$ {expected_receitas}, got R$ {new_receitas}", "ERROR")
                    return False
                
                if abs(new_saldo - expected_saldo) < 0.01:
                    self.log(f"     ✅ Dashboard saldo increased correctly: R$ {initial_saldo} → R$ {new_saldo}")
                else:
                    self.log(f"     ❌ Dashboard saldo not increased correctly: expected R$ {expected_saldo}, got R$ {new_saldo}", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to get updated dashboard: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"    ❌ Error checking dashboard: {str(e)}", "ERROR")
            return False
        
        # Step 7: Delete the transaction (MAIN TEST)
        self.log("  7. Deleting the receita transaction (MAIN TEST)...")
        
        try:
            response = self.session.delete(f"{BACKEND_URL}/transacoes/{receita_transacao_id}")
            if response.status_code == 200:
                delete_response = response.json()
                saldo_revertido = delete_response.get('saldo_revertido', False)
                
                if saldo_revertido:
                    self.log(f"     ✅ Transaction deleted with saldo_revertido: {saldo_revertido}")
                else:
                    self.log(f"     ❌ Response missing 'saldo_revertido': true - got {saldo_revertido}", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to delete transaction: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"    ❌ Error deleting transaction: {str(e)}", "ERROR")
            return False
        
        # Step 8: Verify balance reverted (MAIN VERIFICATION)
        self.log("  8. Verifying balance reverted after deletion (MAIN VERIFICATION)...")
        
        # Check account balance reverted
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{empresa_id}/contas")
            if response.status_code == 200:
                contas = response.json()
                reverted_conta = next((c for c in contas if c.get('id') == conta_id), None)
                if reverted_conta:
                    reverted_saldo_conta = reverted_conta.get('saldo_atual', 0)
                    
                    if abs(reverted_saldo_conta - initial_saldo_conta) < 0.01:
                        self.log(f"     ✅ Account balance reverted correctly: R$ {reverted_saldo_conta} (back to initial R$ {initial_saldo_conta})")
                    else:
                        self.log(f"     ❌ Account balance not reverted correctly: expected R$ {initial_saldo_conta}, got R$ {reverted_saldo_conta}", "ERROR")
                        return False
                else:
                    self.log("     ❌ Account not found after deletion", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to get accounts after deletion: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"    ❌ Error checking account balance after deletion: {str(e)}", "ERROR")
            return False
        
        # Check dashboard totals reverted
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{empresa_id}/dashboard")
            if response.status_code == 200:
                reverted_dashboard = response.json()
                reverted_receitas = reverted_dashboard.get('total_receitas', 0)
                reverted_saldo = reverted_dashboard.get('saldo', 0)
                reverted_saldo_contas = reverted_dashboard.get('saldo_contas', 0)
                
                if abs(reverted_receitas - initial_receitas) < 0.01:
                    self.log(f"     ✅ Dashboard receitas reverted correctly: R$ {reverted_receitas} (back to initial R$ {initial_receitas})")
                else:
                    self.log(f"     ❌ Dashboard receitas not reverted correctly: expected R$ {initial_receitas}, got R$ {reverted_receitas}", "ERROR")
                    return False
                
                if abs(reverted_saldo - initial_saldo) < 0.01:
                    self.log(f"     ✅ Dashboard saldo reverted correctly: R$ {reverted_saldo} (back to initial R$ {initial_saldo})")
                else:
                    self.log(f"     ❌ Dashboard saldo not reverted correctly: expected R$ {initial_saldo}, got R$ {reverted_saldo}", "ERROR")
                    return False
                
                if abs(reverted_saldo_contas - initial_saldo_contas) < 0.01:
                    self.log(f"     ✅ Dashboard saldo em contas reverted correctly: R$ {reverted_saldo_contas}")
                else:
                    self.log(f"     ❌ Dashboard saldo em contas not reverted correctly: expected R$ {initial_saldo_contas}, got R$ {reverted_saldo_contas}", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to get dashboard after deletion: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"    ❌ Error checking dashboard after deletion: {str(e)}", "ERROR")
            return False
        
        # Step 9: Test with DESPESA transaction
        self.log("  9. Testing with DESPESA transaction (R$ 300)...")
        
        despesa_data = {
            "tipo": "despesa",
            "fornecedor": "Fornecedor Teste",
            "descricao": "Teste Despesa para Deletar",
            "valor_total": 300.00,
            "data_competencia": "2025-01-31",
            "categoria_id": categoria_id,
            "centro_custo_id": centro_custo_id,
            "conta_bancaria_id": conta_id
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/empresas/{empresa_id}/transacoes", json=despesa_data)
            if response.status_code == 200:
                created_despesa = response.json()
                despesa_transacao_id = created_despesa.get('id')
                self.log(f"     ✅ Despesa transaction created: {despesa_transacao_id}")
            else:
                self.log(f"    ❌ Failed to create despesa transaction: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"    ❌ Error creating despesa transaction: {str(e)}", "ERROR")
            return False
        
        # Verify account balance decreased
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{empresa_id}/contas")
            if response.status_code == 200:
                contas = response.json()
                updated_conta = next((c for c in contas if c.get('id') == conta_id), None)
                if updated_conta:
                    despesa_saldo_conta = updated_conta.get('saldo_atual', 0)
                    expected_saldo = initial_saldo_conta - 300.0
                    
                    if abs(despesa_saldo_conta - expected_saldo) < 0.01:
                        self.log(f"     ✅ Account balance decreased correctly: R$ {initial_saldo_conta} → R$ {despesa_saldo_conta}")
                    else:
                        self.log(f"     ❌ Account balance not decreased correctly: expected R$ {expected_saldo}, got R$ {despesa_saldo_conta}", "ERROR")
                        return False
            else:
                self.log(f"    ❌ Failed to get accounts after despesa: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"    ❌ Error checking account after despesa: {str(e)}", "ERROR")
            return False
        
        # Delete despesa transaction
        self.log("  10. Deleting despesa transaction...")
        
        try:
            response = self.session.delete(f"{BACKEND_URL}/transacoes/{despesa_transacao_id}")
            if response.status_code == 200:
                delete_response = response.json()
                saldo_revertido = delete_response.get('saldo_revertido', False)
                
                if saldo_revertido:
                    self.log(f"     ✅ Despesa transaction deleted with saldo_revertido: {saldo_revertido}")
                else:
                    self.log(f"     ❌ Response missing 'saldo_revertido': true for despesa", "ERROR")
                    return False
            else:
                self.log(f"    ❌ Failed to delete despesa transaction: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"    ❌ Error deleting despesa transaction: {str(e)}", "ERROR")
            return False
        
        # Verify account balance increased back (reverses the decrease)
        try:
            response = self.session.get(f"{BACKEND_URL}/empresas/{empresa_id}/contas")
            if response.status_code == 200:
                contas = response.json()
                final_conta = next((c for c in contas if c.get('id') == conta_id), None)
                if final_conta:
                    final_saldo_conta = final_conta.get('saldo_atual', 0)
                    
                    if abs(final_saldo_conta - initial_saldo_conta) < 0.01:
                        self.log(f"     ✅ Account balance reverted after despesa deletion: R$ {final_saldo_conta} (back to initial R$ {initial_saldo_conta})")
                    else:
                        self.log(f"     ❌ Account balance not reverted after despesa deletion: expected R$ {initial_saldo_conta}, got R$ {final_saldo_conta}", "ERROR")
                        return False
            else:
                self.log(f"    ❌ Failed to get accounts after despesa deletion: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"    ❌ Error checking account after despesa deletion: {str(e)}", "ERROR")
            return False
        
        self.log("  ✅ Transaction deletion with balance recalculation test PASSED!")
        return True
    
    def run_test(self):
        """Run the transaction deletion test"""
        self.log("=" * 80)
        self.log("STARTING TRANSACTION DELETION BALANCE RECALCULATION TEST")
        self.log("=" * 80)
        
        # Test 1: Admin Login
        if not self.test_admin_login():
            self.log("❌ Cannot continue without successful login", "ERROR")
            return False
        
        # Test 2: Transaction Deletion with Balance Recalculation
        result = self.test_transaction_deletion_balance_recalculation()
        
        self.log("=" * 80)
        if result:
            self.log("✅ TRANSACTION DELETION BALANCE RECALCULATION TEST PASSED!")
        else:
            self.log("❌ TRANSACTION DELETION BALANCE RECALCULATION TEST FAILED!")
        self.log("=" * 80)
        
        return result

if __name__ == "__main__":
    runner = TransactionDeletionTestRunner()
    success = runner.run_test()
    exit(0 if success else 1)