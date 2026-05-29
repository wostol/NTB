-- CreateTable
CREATE TABLE "Role" (
    "role_id" SERIAL NOT NULL,
    "role_name" VARCHAR(50) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "User" (
    "user_id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100),
    "role_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Computer" (
    "computer_id" SERIAL NOT NULL,
    "serial_number" VARCHAR(50) NOT NULL,
    "floor" INTEGER NOT NULL,
    "room" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'available',
    "last_maintenance" TIMESTAMP(3),

    CONSTRAINT "Computer_pkey" PRIMARY KEY ("computer_id")
);

-- CreateTable
CREATE TABLE "PcConfiguration" (
    "id" SERIAL NOT NULL,
    "computer_id" INTEGER NOT NULL,
    "cpu" VARCHAR(100),
    "ram_gb" INTEGER,
    "storage_gb" INTEGER,
    "storage_type" VARCHAR(10),
    "gpu" VARCHAR(100),
    "os" VARCHAR(50),
    "monitor" VARCHAR(50),
    "notes" TEXT,

    CONSTRAINT "PcConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Software" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "version" VARCHAR(50),
    "category" VARCHAR(50),
    "license_type" VARCHAR(50),
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Software_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PcSoftware" (
    "pc_id" INTEGER NOT NULL,
    "software_id" INTEGER NOT NULL,
    "installed_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PcSoftware_pkey" PRIMARY KEY ("pc_id","software_id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "booking_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "computer_id" INTEGER NOT NULL,
    "booking_date" TIMESTAMP(3) NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "booking_type" VARCHAR(20),
    "purpose" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("booking_id")
);

-- CreateTable
CREATE TABLE "Session" (
    "session_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "computer_id" INTEGER NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "status" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "WaitingList" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "computer_id" INTEGER NOT NULL,
    "desired_start_time" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "WaitingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "user_id" INTEGER NOT NULL,
    "computer_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("user_id","computer_id")
);

-- CreateTable
CREATE TABLE "Filter" (
    "filter_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "config_requirements" JSONB,
    "software_requirements" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Filter_pkey" PRIMARY KEY ("filter_id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "log_id" BIGSERIAL NOT NULL,
    "user_id" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" INTEGER,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("log_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_role_name_key" ON "Role"("role_name");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Computer_serial_number_key" ON "Computer"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "PcConfiguration_computer_id_key" ON "PcConfiguration"("computer_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PcConfiguration" ADD CONSTRAINT "PcConfiguration_computer_id_fkey" FOREIGN KEY ("computer_id") REFERENCES "Computer"("computer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PcSoftware" ADD CONSTRAINT "PcSoftware_pc_id_fkey" FOREIGN KEY ("pc_id") REFERENCES "Computer"("computer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PcSoftware" ADD CONSTRAINT "PcSoftware_software_id_fkey" FOREIGN KEY ("software_id") REFERENCES "Software"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_computer_id_fkey" FOREIGN KEY ("computer_id") REFERENCES "Computer"("computer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_computer_id_fkey" FOREIGN KEY ("computer_id") REFERENCES "Computer"("computer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "Booking"("booking_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitingList" ADD CONSTRAINT "WaitingList_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitingList" ADD CONSTRAINT "WaitingList_computer_id_fkey" FOREIGN KEY ("computer_id") REFERENCES "Computer"("computer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_computer_id_fkey" FOREIGN KEY ("computer_id") REFERENCES "Computer"("computer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Filter" ADD CONSTRAINT "Filter_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
