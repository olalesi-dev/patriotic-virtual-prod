import { ModulePageClient } from './PageClient';

interface Props {
    params: { moduleId: string; pageId: string };
}

export default function SpecialtyModulePage({ params }: Props) {
    return <ModulePageClient moduleId={params.moduleId} pageId={params.pageId} />;
}
