import EmployeePayload from '@/app/types/EmployeePayload';

export function employeeRequestPayload(employee: EmployeePayload) {
    return {
        firstName: employee.firstName,
        lastName: employee.lastName.trim(),
        pesel: employee.pesel,
        isPeselFake: employee.isPeselFake ?? false,
        employmentFrom: employee.employmentFrom || null,
        companyUUID: employee.companyUUID,
        departmentUUID: employee.departmentUUID,
        positionUUID: employee.positionUUID,
        contractTypeUUID: employee.contractTypeUUID || null,
        roleUUID: employee.roleUUID,
        email: employee.email?.trim() || null,
        address: employee.address,
        externalCode: employee.externalCode,
        internalCode: employee.internalCode,
        active: employee.active,
        phones: employee.phones.map(phone => phone.trim()).filter(Boolean),
        parentEmployeeUUID: employee.parentEmployeeUUID || null,
        employmentTo: employee.employmentTo || null,
    };
}
