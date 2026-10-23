export default interface Employment {
    position: string,
    contractType: string,
    role: string,
    employmentFrom: string,
    employmentTo: string | null,
    parentEmployee: string | null,
}