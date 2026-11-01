export default interface Employee {
    uuid: string;
    email: string | null;
    loginPhone?: string | null;
    technicalAdministrator?: boolean;
}
