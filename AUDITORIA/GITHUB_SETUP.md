# Guía: Conectar autoPlaya v2 a GitHub desde cero

## Prerequisitos
- Tener Git instalado: https://git-scm.com/download/win
- Tener una cuenta en GitHub: https://github.com
- Verificar instalación: `git --version`

---

## PASO 1 — Crear el repositorio en GitHub

1. Ir a https://github.com/new
2. Completar:
   - **Repository name:** `autoplaya-v2`
   - **Visibility:** Private (recomendado para un SaaS)
   - ❌ NO marcar "Add a README file" (ya tienes uno)
   - ❌ NO agregar .gitignore todavía
3. Clic en **"Create repository"**
4. Copiar la URL que aparece (ej: `https://github.com/TU_USUARIO/autoplaya-v2.git`)

---

## PASO 2 — Crear el .gitignore ANTES del primer commit

Crear el archivo `c:\Proyectos\SAAS\autoPlaya\autoplaya_v2\.gitignore` con:

```
# Archivos de prueba y desarrollo
test_rls.mjs

# Variables de entorno (si en el futuro las usás)
.env
.env.local
.env.production

# Dependencias (si en el futuro usás npm)
node_modules/

# Archivos del sistema
.DS_Store
Thumbs.db

# Caché de editores
.vscode/settings.json
*.swp
```

> ⚠️ IMPORTANTE: `test_rls.mjs` tiene credenciales hardcodeadas.
> Eliminarlo del proyecto o asegurarse de que esté en `.gitignore` ANTES del primer commit.

---

## PASO 3 — Inicializar Git y hacer el primer commit

Abrir PowerShell en el directorio del proyecto y ejecutar estos comandos **en orden**:

```powershell
# 1. Ir al directorio del proyecto
cd "c:\Proyectos\SAAS\autoPlaya\autoplaya_v2"

# 2. Inicializar repositorio Git
git init

# 3. Configurar identidad (solo si es la primera vez)
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"

# 4. Verificar qué archivos se van a commitear
#    (asegurarse de que test_rls.mjs NO aparezca en la lista)
git status

# 5. Agregar todos los archivos
git add .

# 6. Verificar una vez más los archivos staged
git status

# 7. Hacer el primer commit
git commit -m "feat: autoPlaya v2 - release inicial v1.0.0-beta

- Módulos: Inventario, Clientes, Ventas, Caja, Historial, Reportes
- Catálogo público con infinite scroll
- Arquitectura multitenant con RLS en 10 tablas
- Sistema de roles admin/vendedor
- Simulador financiero y generación de PDF"

# 8. Cambiar la rama a 'main' (convención moderna)
git branch -M main

# 9. Conectar con el repositorio remoto de GitHub
#    (reemplazar TU_USUARIO con tu usuario de GitHub)
git remote add origin https://github.com/TU_USUARIO/autoplaya-v2.git

# 10. Subir el código
git push -u origin main
```

GitHub pedirá tus credenciales. Si usás autenticación de dos factores,
necesitás crear un **Personal Access Token** en lugar de usar tu contraseña:
https://github.com/settings/tokens → Generate new token (classic) → marcar `repo`

---

## PASO 4 — Flujo de trabajo diario

```powershell
# Ver qué cambió
git status

# Ver diferencias específicas
git diff

# Agregar cambios
git add .
# O agregar un archivo específico:
git add js/main.js

# Hacer commit con descripción clara
git commit -m "fix: corregir race condition en generación de recibos"

# Subir al repositorio
git push
```

### Convención de commits recomendada:
- `feat:` nueva funcionalidad
- `fix:` corrección de bug
- `refactor:` mejora de código sin cambiar comportamiento
- `style:` cambios de UI/CSS
- `docs:` cambios en documentación
- `chore:` tareas de mantenimiento

---

## PASO 5 — Flujo de ramas para nuevas funcionalidades

```powershell
# Crear rama para nueva feature
git checkout -b feature/modulo-garantias

# ... trabajar en el código ...

# Commitear cambios en la rama
git add .
git commit -m "feat: agregar módulo de garantías de vehículos"

# Subir la rama
git push -u origin feature/modulo-garantias

# En GitHub: crear Pull Request de 'feature/modulo-garantias' → 'main'
# Revisar, aprobar y mergear desde la interfaz web

# Volver a main y actualizar local
git checkout main
git pull
```

---

## Verificación final

Después del push, entrar a `https://github.com/TU_USUARIO/autoplaya-v2` y verificar:
- ✅ Aparecen todos los archivos
- ✅ `test_rls.mjs` NO aparece
- ✅ Se ve el contenido de `VERSION.md` y `CHANGELOG.md`
