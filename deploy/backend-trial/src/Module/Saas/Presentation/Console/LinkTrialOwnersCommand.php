<?php

declare(strict_types=1);

namespace App\Module\Saas\Presentation\Console;

use App\Module\Company\Domain\Entity\User;
use App\Module\Saas\Infrastructure\ControlPlane;
use App\Module\Saas\Infrastructure\TrialOwnerLinker;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'app:saas:link-trial-owners', description: 'Give existing trial founders a Superadministrator employee profile.')]
final class LinkTrialOwnersCommand extends Command
{
    public function __construct(
        private ControlPlane $control,
        private Connection $connection,
        private EntityManagerInterface $em,
        private TrialOwnerLinker $linker,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $rows = $this->control->db()->fetchAllAssociative(
            "SELECT uuid,name,database_name,slug FROM saas_tenant WHERE provisioning='ready' AND slug<>'default' AND status<>'deleted'"
        );
        $platform = $this->connection->getDatabasePlatform();
        foreach ($rows as $row) {
            $database = (string) $row['database_name'];
            if (!preg_match('/^ec_tenant_[a-f0-9]{32}$/D', $database)) {
                $output->writeln('Pominięto '.$row['slug']);
                continue;
            }
            try {
                $this->connection->executeStatement('USE '.$platform->quoteSingleIdentifier($database));
                $this->em->clear();
                $owners = $this->em->createQuery(
                    'SELECT u FROM '.User::class.' u WHERE u.tenantAdministrator = true AND u.employee IS NULL AND u.saasAdministratorUuid IS NULL'
                )->getResult();
                if ($owners === []) {
                    $output->writeln('Już powiązany: '.$row['slug']);
                    continue;
                }
                foreach ($owners as $owner) {
                    $this->linker->link($owner, (string) $row['name']);
                }
                $this->em->flush();
                $output->writeln('Superadministrator: '.$row['slug'].' ('.$row['name'].')');
            } catch (\Throwable $error) {
                $this->em->clear();
                $output->writeln('Błąd '.$row['slug'].': '.$error->getMessage());
            }
        }
        $this->em->clear();
        $this->connection->executeStatement('USE '.$platform->quoteSingleIdentifier($this->control->defaultDatabase()));

        return Command::SUCCESS;
    }
}
