<?php

declare(strict_types=1);

namespace App\Module\Saas\Infrastructure;

use App\Module\Company\Domain\Entity\Address;
use App\Module\Company\Domain\Entity\Company;
use App\Module\Company\Domain\Entity\ContractType;
use App\Module\Company\Domain\Entity\Department;
use App\Module\Company\Domain\Entity\Employee;
use App\Module\Company\Domain\Entity\Industry;
use App\Module\Company\Domain\Entity\Position;
use App\Module\Company\Domain\Entity\Role;
use App\Module\Company\Domain\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Ramsey\Uuid\Uuid;

/** Turns the trial founder into a company employee with the Superadministrator role. */
final readonly class TrialOwnerLinker
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    public function link(User $user, string $companyName): void
    {
        if ($user->getEmployee() !== null || $user->getSaasAdministratorUuid() !== null) {
            return;
        }

        $role = $this->em->getRepository(Role::class)->findOneBy(['name' => 'Superadministrator']);
        $industry = $this->em->getRepository(Industry::class)->findOneBy([]);
        $position = $this->em->getRepository(Position::class)->findOneBy([]);
        $contract = $this->em->getRepository(ContractType::class)->findOneBy([]);
        if (!$role instanceof Role || !$industry instanceof Industry || !$position instanceof Position || !$contract instanceof ContractType) {
            throw new \RuntimeException('Brak roli Superadministrator albo danych słownikowych firmy.');
        }

        $company = new Company();
        $company->setUUID(Uuid::uuid4()->toString());
        $company->setFullName(mb_substr($companyName, 0, 1000));
        $company->setShortName(mb_substr($companyName, 0, 200));
        $company->setInternalCode('FIRMA');
        $company->setNip('5250001233');
        $company->setRegon('123456785');
        $company->setActive(true);
        $company->setIndustry($industry);

        $department = new Department();
        $department->setUUID(Uuid::uuid4()->toString());
        $department->setName('Biuro');
        $department->setInternalCode('BIURO');
        $department->setActive(true);
        $department->setCompany($company);

        $employee = new Employee();
        $employee->setUUID(Uuid::uuid4()->toString());
        $employee->setFirstName('Właściciel');
        $employee->setLastName(mb_substr($companyName !== '' ? $companyName : 'Firmy', 0, 50));
        $employee->setPESEL('44051401359');
        $employee->setIsPeselFake(true);
        $employee->setActive(true);
        $employee->setEmploymentFrom(new \DateTime('today'));
        $employee->setCompany($company);
        $employee->setDepartment($department);
        $employee->setRole($role);
        $employee->setPosition($position);
        $employee->setContractType($contract);
        $employee->setUser($user);
        $user->makeTenantAdministrator();

        $address = new Address();
        $address->setUuid(Uuid::uuid4());
        $address->setStreet('do uzupełnienia');
        $address->setPostcode('00-001');
        $address->setCity('nie podano');
        $address->setCountry('Polska');
        $address->setActive(true);
        $address->setCompany($company);
        $company->setAddress($address);

        $this->em->persist($company);
        $this->em->persist($department);
        $this->em->persist($employee);
        $this->em->persist($address);
        $this->em->persist($user);
    }
}
