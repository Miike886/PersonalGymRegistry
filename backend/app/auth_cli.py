"""Generate the owner's Argon2 hash without putting the password in shell history."""
from getpass import getpass
from .auth import password_hasher


def main():
    password = getpass("Nueva contraseña (12-128 caracteres): ")
    if not 12 <= len(password) <= 128:
        raise SystemExit("Usa una contraseña de 12 a 128 caracteres.")
    if password != getpass("Confirma la contraseña: "):
        raise SystemExit("Las contraseñas no coinciden.")
    print("Guarda este valor como OWNER_PASSWORD_HASH en el backend:")
    print(password_hasher.hash(password))


if __name__ == "__main__":
    main()
