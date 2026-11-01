import Employee from '@/app/types/Employee';
import EmployeePayload from '@/app/types/EmployeePayload';
import EmployeeForm from '@/app/components/employee/modal/Create';

interface EditEmployeeModalProps {
    open: boolean;
    onClose: () => void;
    employee: Employee | null;
    onSave: (employee: EmployeePayload) => Promise<void>;
}

export default function EditEmployeeModal({ open, onClose, employee, onSave }: EditEmployeeModalProps) {
    if (!employee) return null;
    return <EmployeeForm key={employee.uuid} open={open} onClose={onClose} employee={employee} onAddEmployee={onSave} />;
}
