export function passwordRules(password: string, confirmation: string, current?: string) {
    const length = Array.from(password).length;
    return [
        { label: 'Od 8 do 64 znaków (maksymalnie 72 bajty)', valid: length >= 8 && length <= 64 && new TextEncoder().encode(password).length <= 72 },
        { label: 'Co najmniej jedna duża litera', valid: /\p{Lu}/u.test(password) },
        { label: 'Co najmniej jedna mała litera', valid: /\p{Ll}/u.test(password) },
        { label: 'Co najmniej jedna cyfra', valid: /[0-9]/.test(password) },
        { label: 'Co najmniej jeden znak specjalny', valid: /[^\p{L}\p{N}\s]/u.test(password) },
        { label: 'Brak znaków sterujących', valid: password.length > 0 && !/[\x00-\x1F\x7F]/.test(password) },
        ...(current === undefined ? [] : [{ label: 'Hasło inne niż dotychczasowe', valid: current.length > 0 && password.length > 0 && current !== password }]),
        { label: 'Potwierdzenie hasła jest zgodne', valid: password.length > 0 && password === confirmation },
    ];
}
